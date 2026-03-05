use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Redirect, Response},
    Json,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{env, sync::Arc};

use crate::{session, session::AuthUser, ApiResponse, AppState};
use entity::{premium_bindings, site_settings, users};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub nickname: String,
}

#[derive(Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct OAuthProvidersResponse {
    pub google: bool,
    pub microsoft: bool,
}

#[derive(Serialize)]
pub struct OAuthStartResponse {
    pub provider: String,
    pub enabled: bool,
    pub url: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthStartQuery {
    pub intent: Option<String>,
}

#[derive(Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct OAuthStateData {
    ts: i64,
    nonce: String,
    provider: String,
    intent: String,
    uid: Option<i32>,
}

#[derive(Deserialize)]
struct OAuthTokenResponse {
    access_token: String,
}

#[derive(Deserialize)]
struct GoogleUserInfo {
    email: Option<String>,
    name: Option<String>,
    sub: Option<String>,
}

#[derive(Deserialize)]
struct MicrosoftUserInfo {
    #[serde(rename = "mail")]
    mail: Option<String>,
    #[serde(rename = "userPrincipalName")]
    user_principal_name: Option<String>,
    #[serde(rename = "displayName")]
    display_name: Option<String>,
    id: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserDto,
}

#[derive(Serialize)]
pub struct UserDto {
    pub uid: i32,
    pub email: String,
    pub nickname: String,
    pub avatar: Option<String>,
    pub score: i32,
    pub permission: i32,
    pub register_at: Option<String>,
    pub last_sign_at: Option<String>,
    pub verified: bool,
    pub is_admin: bool,
}

fn empty_user() -> UserDto {
    UserDto {
        uid: 0,
        email: String::new(),
        nickname: String::new(),
        avatar: None,
        score: 0,
        permission: 0,
        register_at: None,
        last_sign_at: None,
        verified: false,
        is_admin: false,
    }
}

fn user_to_dto(user: &users::Model) -> UserDto {
    UserDto {
        uid: user.uid,
        email: user.email.clone(),
        nickname: user.nickname.clone(),
        avatar: user.avatar.clone(),
        score: user.score.unwrap_or(0),
        permission: user.permission.unwrap_or(0),
        register_at: Some(user.register_at.to_string()),
        last_sign_at: user.last_sign_at.as_ref().map(|dt| dt.to_string()),
        verified: user.verified.unwrap_or(false),
        is_admin: user.is_admin.unwrap_or(false),
    }
}

fn login_response_with_cookie(token: String, user: UserDto) -> Response {
    (
        [(header::SET_COOKIE, session::build_session_cookie(&token))],
        Json(ApiResponse {
            code: 0,
            message: "success".to_string(),
            data: LoginResponse { token, user },
        }),
    )
        .into_response()
}

fn login_error_response(message: &str) -> Response {
    (
        StatusCode::OK,
        Json(ApiResponse {
            code: 1,
            message: message.to_string(),
            data: LoginResponse {
                token: String::new(),
                user: empty_user(),
            },
        }),
    )
        .into_response()
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Response {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};

    let user = match users::Entity::find()
        .filter(users::Column::Email.eq(&req.email))
        .one(&state.db)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return login_error_response("Invalid email or password");
        }
        Err(_) => {
            return login_error_response("Database error");
        }
    };

    let parsed_hash = match PasswordHash::new(&user.password_hash) {
        Ok(hash) => hash,
        Err(_) => {
            return login_error_response("Invalid password hash");
        }
    };

    if Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return login_error_response("Invalid email or password");
    }

    let token = session::issue_session_token(user.uid);
    login_response_with_cookie(token, user_to_dto(&user))
}

pub async fn logout() -> Response {
    (
        [(header::SET_COOKIE, session::clear_session_cookie())],
        Json(ApiResponse {
            code: 0,
            message: "success".to_string(),
            data: (),
        }),
    )
        .into_response()
}

pub async fn get_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Json<ApiResponse<UserDto>> {
    match users::Entity::find_by_id(auth_user.uid).one(&state.db).await {
        Ok(Some(user)) => Json(ApiResponse {
            code: 0,
            message: "success".to_string(),
            data: user_to_dto(&user),
        }),
        Ok(None) => Json(ApiResponse {
            code: 401,
            message: "Unauthorized".to_string(),
            data: empty_user(),
        }),
        Err(_) => Json(ApiResponse {
            code: 1,
            message: "Database error".to_string(),
            data: empty_user(),
        }),
    }
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Response {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };
    let existing = users::Entity::find()
        .filter(users::Column::Email.eq(&req.email))
        .one(&state.db)
        .await;

    match existing {
        Ok(Some(_)) => {
            return login_error_response("Email already exists");
        }
        Err(_) => {
            return login_error_response("Database error");
        }
        Ok(None) => {}
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = match argon2.hash_password(req.password.as_bytes(), &salt) {
        Ok(hash) => hash.to_string(),
        Err(_) => {
            return login_error_response("Password hashing failed");
        }
    };

    let now = chrono::Utc::now().naive_utc();
    let new_user = users::ActiveModel {
        email: Set(req.email.clone()),
        password_hash: Set(password_hash),
        nickname: Set(req.nickname.clone()),
        is_admin: Set(Some(false)),
        verified: Set(Some(false)),
        register_at: Set(now),
        score: Set(Some(0)),
        permission: Set(Some(0)),
        ..Default::default()
    };

    let mut user = match new_user.insert(&state.db).await {
        Ok(user) => user,
        Err(_) => {
            return login_error_response("Failed to create user");
        }
    };

    let should_be_admin = users::Entity::find()
        .order_by_asc(users::Column::Uid)
        .one(&state.db)
        .await
        .ok()
        .flatten()
        .map(|first| first.uid == user.uid)
        .unwrap_or(false);

    if should_be_admin {
        let mut active: users::ActiveModel = user.into();
        active.is_admin = Set(Some(true));
        active.permission = Set(Some(2));
        active.verified = Set(Some(true));

        user = match active.update(&state.db).await {
            Ok(updated) => updated,
            Err(_) => return login_error_response("Failed to promote first user to admin"),
        };
    }

    let token = session::issue_session_token(user.uid);
    login_response_with_cookie(token, user_to_dto(&user))
}

pub async fn forgot_password(
    Json(req): Json<ForgotPasswordRequest>,
) -> Json<ApiResponse<()>> {
    if req.email.trim().is_empty() {
        return Json(ApiResponse {
            code: 1,
            message: "Email is required".to_string(),
            data: (),
        });
    }

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    })
}

pub async fn verify_email(
    Json(req): Json<VerifyEmailRequest>,
) -> Json<ApiResponse<()>> {
    if req.token.trim().is_empty() {
        return Json(ApiResponse {
            code: 1,
            message: "Token is required".to_string(),
            data: (),
        });
    }

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    })
}

pub async fn reset_password(
    Json(req): Json<ResetPasswordRequest>,
) -> Json<ApiResponse<()>> {
    if req.token.trim().is_empty() {
        return Json(ApiResponse {
            code: 1,
            message: "Token is required".to_string(),
            data: (),
        });
    }

    if req.password.trim().len() < 8 {
        return Json(ApiResponse {
            code: 1,
            message: "Password must be at least 8 characters".to_string(),
            data: (),
        });
    }

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    })
}

fn get_env_non_empty(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

fn first_non_empty(candidates: &[Option<String>]) -> Option<String> {
    candidates.iter().flatten().find(|v| !v.trim().is_empty()).cloned()
}

async fn load_site_settings(state: &Arc<AppState>) -> Option<site_settings::Model> {
    site_settings::Entity::find().one(&state.db).await.ok().flatten()
}

async fn oauth_client_config(
    state: &Arc<AppState>,
    provider: &str,
) -> Option<(String, String, String, String)> {
    let settings = load_site_settings(state).await;

    match provider {
        "google" => {
            let client_id = first_non_empty(&[
                settings.as_ref().and_then(|s| s.google_client_id.clone()),
                get_env_non_empty("GOOGLE_CLIENT_ID"),
            ])?;
            let client_secret = first_non_empty(&[
                settings.as_ref().and_then(|s| s.google_client_secret.clone()),
                get_env_non_empty("GOOGLE_CLIENT_SECRET"),
            ])?;
            let authorize_url = "https://accounts.google.com/o/oauth2/v2/auth".to_string();
            let token_url = "https://oauth2.googleapis.com/token".to_string();
            Some((client_id, client_secret, authorize_url, token_url))
        }
        "microsoft" => {
            let client_id = first_non_empty(&[
                settings.as_ref().and_then(|s| s.microsoft_client_id.clone()),
                get_env_non_empty("MICROSOFT_CLIENT_ID"),
            ])?;
            let client_secret = first_non_empty(&[
                settings
                    .as_ref()
                    .and_then(|s| s.microsoft_client_secret.clone()),
                get_env_non_empty("MICROSOFT_CLIENT_SECRET"),
            ])?;
            let authorize_url =
                "https://login.microsoftonline.com/common/oauth2/v2.0/authorize".to_string();
            let token_url =
                "https://login.microsoftonline.com/common/oauth2/v2.0/token".to_string();
            Some((client_id, client_secret, authorize_url, token_url))
        }
        _ => None,
    }
}

fn oauth_scope(provider: &str) -> &'static str {
    match provider {
        "google" => "openid email profile",
        "microsoft" => "openid profile email User.Read",
        _ => "",
    }
}

async fn state_secret(state: &Arc<AppState>) -> String {
    let settings = load_site_settings(state).await;
    first_non_empty(&[
        settings.and_then(|s| s.oauth_state_secret),
        get_env_non_empty("OAUTH_STATE_SECRET"),
    ])
    .unwrap_or_else(|| "change-me-in-prod".to_string())
}

async fn sign_state_payload(state: &Arc<AppState>, payload: &OAuthStateData) -> String {
    let payload_json = serde_json::to_string(payload).unwrap_or_default();
    let payload_b64 = base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload_json.as_bytes(),
    );

    let secret = state_secret(state).await;
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", secret, payload_b64).as_bytes());
    let signature = hex::encode(hasher.finalize());
    format!("{}.{}", payload_b64, signature)
}

async fn verify_state_payload(app_state: &Arc<AppState>, state: &str) -> Option<OAuthStateData> {
    let mut parts = state.split('.');
    let payload_b64 = parts.next()?;
    let signature = parts.next()?;
    if parts.next().is_some() {
        return None;
    }

    let secret = state_secret(app_state).await;
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", secret, payload_b64).as_bytes());
    let expected = hex::encode(hasher.finalize());
    if signature != expected {
        return None;
    }

    let payload_bytes = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        payload_b64,
    )
    .ok()?;
    let payload: OAuthStateData = serde_json::from_slice(&payload_bytes).ok()?;
    let now = chrono::Utc::now().timestamp();
    if now - payload.ts > 600 {
        return None;
    }

    Some(payload)
}

fn callback_url(base_url: &str, provider: &str) -> String {
    format!("{}/api/auth/oauth/{}/callback", base_url.trim_end_matches('/'), provider)
}

fn redirect_with_error(provider: &str, message: &str) -> Redirect {
    let encoded = urlencoding::encode(message);
    Redirect::temporary(&format!("/auth/login?oauth_provider={}&oauth_error={}", provider, encoded))
}

async fn exchange_oauth_token(
    provider: &str,
    token_url: &str,
    client_id: &str,
    client_secret: &str,
    redirect_uri: &str,
    code: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "authorization_code"),
        ("client_id", client_id),
        ("client_secret", client_secret),
        ("redirect_uri", redirect_uri),
        ("code", code),
    ];

    let response = client
        .post(token_url)
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Token exchange failed: {}", response.status()));
    }

    let body: OAuthTokenResponse = response
        .json()
        .await
        .map_err(|e| format!("Token parse failed: {}", e))?;

    if body.access_token.trim().is_empty() {
        return Err(format!("{} token missing", provider));
    }

    Ok(body.access_token)
}

async fn fetch_oauth_profile(provider: &str, access_token: &str) -> Result<(String, String, String), String> {
    let client = reqwest::Client::new();

    match provider {
        "google" => {
            let response = client
                .get("https://openidconnect.googleapis.com/v1/userinfo")
                .bearer_auth(access_token)
                .send()
                .await
                .map_err(|e| format!("Google profile request failed: {}", e))?;

            if !response.status().is_success() {
                return Err(format!("Google profile request failed: {}", response.status()));
            }

            let profile: GoogleUserInfo = response
                .json()
                .await
                .map_err(|e| format!("Google profile parse failed: {}", e))?;

            let email = profile.email.ok_or_else(|| "Google email missing".to_string())?;
            let nickname = profile.name.unwrap_or_else(|| "GoogleUser".to_string());
            let provider_id = profile.sub.unwrap_or_else(|| email.clone());
            Ok((email, nickname, provider_id))
        }
        "microsoft" => {
            let response = client
                .get("https://graph.microsoft.com/v1.0/me")
                .bearer_auth(access_token)
                .send()
                .await
                .map_err(|e| format!("Microsoft profile request failed: {}", e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "Microsoft profile request failed: {}",
                    response.status()
                ));
            }

            let profile: MicrosoftUserInfo = response
                .json()
                .await
                .map_err(|e| format!("Microsoft profile parse failed: {}", e))?;

            let email = profile
                .mail
                .or(profile.user_principal_name)
                .ok_or_else(|| "Microsoft email missing".to_string())?;
            let nickname = profile.display_name.unwrap_or_else(|| "MicrosoftUser".to_string());
            let provider_id = profile.id.unwrap_or_else(|| email.clone());
            Ok((email, nickname, provider_id))
        }
        _ => Err("Unsupported provider".to_string()),
    }
}

async fn find_or_create_user_by_email(
    state: &Arc<AppState>,
    email: &str,
    nickname: &str,
) -> Result<users::Model, String> {
    if let Some(existing) = users::Entity::find()
        .filter(users::Column::Email.eq(email))
        .one(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?
    {
        return Ok(existing);
    }

    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let temp_password = uuid::Uuid::new_v4().to_string();
    let salt = SaltString::generate(&mut OsRng);
    let hash = Argon2::default()
        .hash_password(temp_password.as_bytes(), &salt)
        .map_err(|e| format!("Password hash failed: {}", e))?
        .to_string();

    let now = chrono::Utc::now().naive_utc();
    let active = users::ActiveModel {
        email: Set(email.to_string()),
        nickname: Set(nickname.to_string()),
        password_hash: Set(hash),
        verified: Set(Some(true)),
        is_admin: Set(Some(false)),
        register_at: Set(now),
        score: Set(Some(0)),
        permission: Set(Some(0)),
        ..Default::default()
    };

    active
        .insert(&state.db)
        .await
        .map_err(|e| format!("Create user failed: {}", e))
}

async fn bind_premium_from_oauth(
    state: &Arc<AppState>,
    uid: i32,
    provider: &str,
    provider_uuid: &str,
    username: &str,
    access_token: &str,
) -> Result<(), String> {
    if provider != "microsoft" {
        return Err("Only Microsoft is supported for premium binding".to_string());
    }

    let token_hash = {
        let mut hasher = Sha256::new();
        hasher.update(access_token.as_bytes());
        hex::encode(hasher.finalize())
    };

    if let Some(existing) = premium_bindings::Entity::find_by_id(uid)
        .one(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?
    {
        let mut active: premium_bindings::ActiveModel = existing.into();
        active.uuid = Set(provider_uuid.to_string());
        active.username = Set(username.to_string());
        active.bound_at = Set(chrono::Utc::now().naive_utc());
        active.token_hash = Set(Some(token_hash));
        active
            .update(&state.db)
            .await
            .map_err(|e| format!("Update binding failed: {}", e))?;
    } else {
        let active = premium_bindings::ActiveModel {
            uid: Set(uid),
            uuid: Set(provider_uuid.to_string()),
            username: Set(username.to_string()),
            bound_at: Set(chrono::Utc::now().naive_utc()),
            token_hash: Set(Some(token_hash)),
        };
        active
            .insert(&state.db)
            .await
            .map_err(|e| format!("Create binding failed: {}", e))?;
    }

    Ok(())
}

pub async fn oauth_providers(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<OAuthProvidersResponse>> {
    let google = oauth_client_config(&state, "google").await.is_some();
    let microsoft = oauth_client_config(&state, "microsoft").await.is_some();

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: OAuthProvidersResponse {
            google,
            microsoft,
        },
    })
}

pub async fn oauth_start(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(provider): Path<String>,
    Query(query): Query<OAuthStartQuery>,
) -> Json<ApiResponse<OAuthStartResponse>> {
    if oauth_client_config(&state, &provider).await.is_none() {
        return Json(ApiResponse {
            code: 1,
            message: format!("{} OAuth is not configured", provider),
            data: OAuthStartResponse {
                provider,
                enabled: false,
                url: None,
            },
        });
    }

    let intent = query.intent.unwrap_or_else(|| "login".to_string());
    let uid = if intent == "bind_premium" {
        match session::parse_request_uid(&headers) {
            Some(uid) => Some(uid),
            None => {
                return Json(ApiResponse {
                    code: 401,
                    message: "Unauthorized".to_string(),
                    data: OAuthStartResponse {
                        provider,
                        enabled: true,
                        url: None,
                    },
                })
            }
        }
    } else {
        None
    };

    let nonce = uuid::Uuid::new_v4().to_string();
    let state_payload = OAuthStateData {
        ts: chrono::Utc::now().timestamp(),
        nonce,
        provider: provider.clone(),
        intent,
        uid,
    };
    let state_token = sign_state_payload(&state, &state_payload).await;

    let Some((client_id, _secret, authorize_url, _token_url)) = oauth_client_config(&state, &provider).await else {
        return Json(ApiResponse {
            code: 1,
            message: "OAuth provider config missing".to_string(),
            data: OAuthStartResponse {
                provider,
                enabled: false,
                url: None,
            },
        });
    };

    let redirect_uri = callback_url(&state.public_base_url, &provider);
    let auth_url = format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}",
        authorize_url,
        urlencoding::encode(&client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(oauth_scope(&provider)),
        urlencoding::encode(&state_token),
    );

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: OAuthStartResponse {
            provider,
            enabled: true,
            url: Some(auth_url),
        },
    })
}

pub async fn oauth_callback(
    State(state): State<Arc<AppState>>,
    Path(provider): Path<String>,
    Query(query): Query<OAuthCallbackQuery>,
) -> Response {
    if let Some(error) = query.error {
        let message = query.error_description.unwrap_or(error);
        return redirect_with_error(&provider, &message).into_response();
    }

    let Some(code) = query.code else {
        return redirect_with_error(&provider, "Missing authorization code").into_response();
    };

    let Some(state_token) = query.state else {
        return redirect_with_error(&provider, "Missing state").into_response();
    };

    let Some(state_data) = verify_state_payload(&state, &state_token).await else {
        return redirect_with_error(&provider, "Invalid state").into_response();
    };

    if state_data.provider != provider {
        return redirect_with_error(&provider, "Provider mismatch").into_response();
    }

    let Some((client_id, client_secret, _authorize_url, token_url)) = oauth_client_config(&state, &provider).await
    else {
        return redirect_with_error(&provider, "OAuth config missing").into_response();
    };

    let redirect_uri = callback_url(&state.public_base_url, &provider);
    let access_token = match exchange_oauth_token(
        &provider,
        &token_url,
        &client_id,
        &client_secret,
        &redirect_uri,
        &code,
    )
    .await
    {
        Ok(token) => token,
        Err(e) => return redirect_with_error(&provider, &e).into_response(),
    };

    let (email, nickname, provider_id) = match fetch_oauth_profile(&provider, &access_token).await {
        Ok(data) => data,
        Err(e) => return redirect_with_error(&provider, &e).into_response(),
    };

    if state_data.intent == "bind_premium" {
        let Some(uid) = state_data.uid else {
            return redirect_with_error(&provider, "Missing session uid").into_response();
        };
        if let Err(e) =
            bind_premium_from_oauth(&state, uid, &provider, &provider_id, &nickname, &access_token).await
        {
            return redirect_with_error(&provider, &e).into_response();
        }
        return Redirect::temporary("/user/premium?bind=success").into_response();
    }

    let user = match find_or_create_user_by_email(&state, &email, &nickname).await {
        Ok(user) => user,
        Err(e) => return redirect_with_error(&provider, &e).into_response(),
    };

    let login_token = session::issue_session_token(user.uid);
    (
        [(header::SET_COOKIE, session::build_session_cookie(&login_token))],
        Redirect::temporary("/auth/login?oauth=success"),
    )
        .into_response()
}
