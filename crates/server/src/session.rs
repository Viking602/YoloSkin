use axum::{
    extract::FromRequestParts,
    http::{header, request::Parts, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::env;

#[derive(Clone, Copy, Debug)]
pub struct AuthUser {
    pub uid: i32,
}

#[derive(Serialize, Deserialize)]
struct SessionPayload {
    uid: i32,
    exp: i64,
}

fn session_secret() -> String {
    env::var("SESSION_SECRET").unwrap_or_else(|_| "change-me-in-prod".to_string())
}

fn session_cookie_name() -> String {
    env::var("SESSION_COOKIE_NAME").unwrap_or_else(|_| "gs_session".to_string())
}

fn session_cookie_secure() -> bool {
    env::var("SESSION_COOKIE_SECURE")
        .map(|v| {
            let val = v.trim().to_ascii_lowercase();
            val == "1" || val == "true" || val == "yes"
        })
        .unwrap_or(false)
}

pub fn build_session_cookie(token: &str) -> String {
    let mut cookie = format!(
        "{}={}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}",
        session_cookie_name(),
        token,
        60 * 60 * 24 * 30
    );

    if session_cookie_secure() {
        cookie.push_str("; Secure");
    }

    cookie
}

pub fn clear_session_cookie() -> String {
    let mut cookie = format!(
        "{}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        session_cookie_name()
    );

    if session_cookie_secure() {
        cookie.push_str("; Secure");
    }

    cookie
}

pub fn issue_session_token(uid: i32) -> String {
    let payload = SessionPayload {
        uid,
        exp: chrono::Utc::now().timestamp() + 60 * 60 * 24 * 30,
    };

    let payload_json = serde_json::to_string(&payload).unwrap_or_default();
    let payload_b64 =
        base64::Engine::encode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, payload_json);

    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", session_secret(), payload_b64).as_bytes());
    let signature = hex::encode(hasher.finalize());

    format!("{}.{}", payload_b64, signature)
}

fn verify_session_token(token: &str) -> Option<SessionPayload> {
    let mut parts = token.split('.');
    let payload_b64 = parts.next()?;
    let signature = parts.next()?;
    if parts.next().is_some() {
        return None;
    }

    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", session_secret(), payload_b64).as_bytes());
    let expected = hex::encode(hasher.finalize());
    if signature != expected {
        return None;
    }

    let payload_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload_b64,
    )
    .ok()?;
    let payload: SessionPayload = serde_json::from_slice(&payload_bytes).ok()?;

    if payload.exp < chrono::Utc::now().timestamp() {
        return None;
    }

    Some(payload)
}

pub fn parse_bearer_uid(headers: &HeaderMap) -> Option<i32> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    let token = value.strip_prefix("Bearer ")?;
    verify_session_token(token).map(|payload| payload.uid)
}

pub fn parse_cookie_uid(headers: &HeaderMap) -> Option<i32> {
    let cookie_header = headers.get(header::COOKIE)?.to_str().ok()?;
    let cookie_name = session_cookie_name();

    for item in cookie_header.split(';') {
        let mut kv = item.trim().splitn(2, '=');
        let Some(key) = kv.next() else {
            continue;
        };
        let Some(value) = kv.next() else {
            continue;
        };
        let key = key.trim();
        let value = value.trim();

        if key == cookie_name {
            return verify_session_token(value).map(|payload| payload.uid);
        }
    }

    None
}

pub fn parse_request_uid(headers: &HeaderMap) -> Option<i32> {
    parse_bearer_uid(headers).or_else(|| parse_cookie_uid(headers))
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(uid) = parse_request_uid(&parts.headers) else {
            let body = Json(serde_json::json!({
                "code": 401,
                "message": "Unauthorized",
                "data": serde_json::Value::Null,
            }));
            return Err((StatusCode::UNAUTHORIZED, body).into_response());
        };

        Ok(Self { uid })
    }
}
