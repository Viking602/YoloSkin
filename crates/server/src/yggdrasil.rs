use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rsa::{
    pkcs1v15::SigningKey,
    pkcs8::{DecodePrivateKey, DecodePublicKey},
    signature::{SignatureEncoding, Signer},
    RsaPrivateKey, RsaPublicKey,
};
use sha1::Sha1;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::AppState;
use entity::{join_sessions, players, textures, users, yggdrasil_keys, yggdrasil_tokens};

const TOKEN_EXPIRY_HOURS: i64 = 168;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/authserver/authenticate", post(authenticate))
        .route("/authserver/refresh", post(refresh))
        .route("/authserver/validate", post(validate))
        .route("/authserver/invalidate", post(invalidate))
        .route("/authserver/signout", post(signout))
        .route("/sessionserver/session/minecraft/join", post(join))
        .route(
            "/sessionserver/session/minecraft/hasJoined",
            get(has_joined),
        )
        .route(
            "/sessionserver/session/minecraft/profile/:uuid",
            get(get_profile),
        )
        .route("/minecraftservices/publickeys", get(public_keys))
        .route("/api/profiles/minecraft", post(bulk_profiles))
}

#[derive(Serialize)]
struct YggdrasilError {
    error: String,
    #[serde(rename = "errorMessage")]
    error_message: String,
}

fn error_response(status: StatusCode, error: &str, message: &str) -> Response {
    (
        status,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
        Json(YggdrasilError {
            error: error.to_string(),
            error_message: message.to_string(),
        }),
    )
        .into_response()
}

fn add_api_header<T: Serialize>(json: Json<T>) -> Response {
    (
        StatusCode::OK,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
        json,
    )
        .into_response()
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

#[derive(Deserialize)]
pub struct AuthenticateRequest {
    username: String,
    password: String,
    #[serde(rename = "clientToken")]
    client_token: Option<String>,
    #[serde(rename = "requestUser")]
    request_user: Option<bool>,
}

#[derive(Serialize)]
pub struct AuthenticateResponse {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "clientToken")]
    client_token: String,
    #[serde(rename = "availableProfiles")]
    available_profiles: Vec<Profile>,
    #[serde(rename = "selectedProfile", skip_serializing_if = "Option::is_none")]
    selected_profile: Option<Profile>,
    #[serde(skip_serializing_if = "Option::is_none")]
    user: Option<User>,
}

#[derive(Serialize, Clone)]
pub struct Profile {
    id: String,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    properties: Option<Vec<Property>>,
}

#[derive(Serialize, Clone)]
pub struct Property {
    name: String,
    value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    signature: Option<String>,
}

#[derive(Serialize)]
pub struct User {
    id: String,
    properties: Vec<UserProperty>,
}

#[derive(Serialize)]
pub struct UserProperty {
    name: String,
    value: String,
}

pub async fn authenticate(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AuthenticateRequest>,
) -> Response {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};

    let user = match users::Entity::find()
        .filter(users::Column::Email.eq(&req.username))
        .one(&state.db)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid credentials. Invalid username or password.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let parsed_hash = match PasswordHash::new(&user.password_hash) {
        Ok(hash) => hash,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Invalid password hash",
            );
        }
    };

    if Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return error_response(
            StatusCode::FORBIDDEN,
            "ForbiddenOperationException",
            "Invalid credentials. Invalid username or password.",
        );
    }

    let player_list = match players::Entity::find()
        .filter(players::Column::Uid.eq(user.uid))
        .all(&state.db)
        .await
    {
        Ok(players) => players,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let available_profiles: Vec<Profile> = player_list
        .iter()
        .map(|p| Profile {
            id: p.uuid.replace("-", ""),
            name: p.player_name.clone(),
            properties: None,
        })
        .collect();

    let selected_profile = available_profiles.first().cloned();

    let access_token = uuid::Uuid::new_v4().to_string().replace("-", "");
    let client_token = req
        .client_token
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string().replace("-", ""));

    let now = chrono::Utc::now().naive_utc();
    let expires_at = now + chrono::Duration::hours(TOKEN_EXPIRY_HOURS);

    let token_model = yggdrasil_tokens::ActiveModel {
        access_token_hash: Set(hash_token(&access_token)),
        client_token_hash: Set(hash_token(&client_token)),
        uid: Set(user.uid),
        expires_at: Set(expires_at),
        last_used_at: Set(now),
        ..Default::default()
    };

    if token_model.insert(&state.db).await.is_err() {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "InternalError",
            "Failed to create token",
        );
    }

    let user_response = if req.request_user.unwrap_or(false) {
        Some(User {
            id: user.uid.to_string(),
            properties: vec![UserProperty {
                name: "preferredLanguage".to_string(),
                value: "en".to_string(),
            }],
        })
    } else {
        None
    };

    add_api_header(Json(AuthenticateResponse {
        access_token,
        client_token,
        available_profiles,
        selected_profile,
        user: user_response,
    }))
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "clientToken")]
    client_token: Option<String>,
    #[serde(rename = "requestUser")]
    request_user: Option<bool>,
    #[serde(rename = "selectedProfile")]
    selected_profile: Option<ProfileSelection>,
}

#[derive(Deserialize)]
pub struct ProfileSelection {
    id: String,
    #[allow(dead_code)]
    name: String,
}

pub async fn refresh(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RefreshRequest>,
) -> Response {
    let access_hash = hash_token(&req.access_token);

    let token = match yggdrasil_tokens::Entity::find()
        .filter(yggdrasil_tokens::Column::AccessTokenHash.eq(&access_hash))
        .one(&state.db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    if let Some(ref ct) = req.client_token {
        if hash_token(ct) != token.client_token_hash {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
    }

    let user = match users::Entity::find_by_id(token.uid).one(&state.db).await {
        Ok(Some(u)) => u,
        _ => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
    };

    let player_list = match players::Entity::find()
        .filter(players::Column::Uid.eq(user.uid))
        .all(&state.db)
        .await
    {
        Ok(players) => players,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let available_profiles: Vec<Profile> = player_list
        .iter()
        .map(|p| Profile {
            id: p.uuid.replace("-", ""),
            name: p.player_name.clone(),
            properties: None,
        })
        .collect();

    let selected_profile = if let Some(ref sel) = req.selected_profile {
        available_profiles
            .iter()
            .find(|p| p.id == sel.id.replace("-", ""))
            .cloned()
    } else {
        available_profiles.first().cloned()
    };

    let _ = yggdrasil_tokens::Entity::delete_by_id(token.id)
        .exec(&state.db)
        .await;

    let new_access_token = uuid::Uuid::new_v4().to_string().replace("-", "");
    let client_token = req
        .client_token
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string().replace("-", ""));

    let now = chrono::Utc::now().naive_utc();
    let expires_at = now + chrono::Duration::hours(TOKEN_EXPIRY_HOURS);

    let new_token = yggdrasil_tokens::ActiveModel {
        access_token_hash: Set(hash_token(&new_access_token)),
        client_token_hash: Set(hash_token(&client_token)),
        uid: Set(user.uid),
        expires_at: Set(expires_at),
        last_used_at: Set(now),
        ..Default::default()
    };

    if new_token.insert(&state.db).await.is_err() {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "InternalError",
            "Failed to create token",
        );
    }

    let user_response = if req.request_user.unwrap_or(false) {
        Some(User {
            id: user.uid.to_string(),
            properties: vec![UserProperty {
                name: "preferredLanguage".to_string(),
                value: "en".to_string(),
            }],
        })
    } else {
        None
    };

    add_api_header(Json(AuthenticateResponse {
        access_token: new_access_token,
        client_token,
        available_profiles,
        selected_profile,
        user: user_response,
    }))
}

#[derive(Deserialize)]
pub struct ValidateRequest {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "clientToken")]
    client_token: Option<String>,
}

pub async fn validate(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ValidateRequest>,
) -> Response {
    let access_hash = hash_token(&req.access_token);

    let token = match yggdrasil_tokens::Entity::find()
        .filter(yggdrasil_tokens::Column::AccessTokenHash.eq(&access_hash))
        .one(&state.db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    if let Some(ref ct) = req.client_token {
        if hash_token(ct) != token.client_token_hash {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
    }

    let now = chrono::Utc::now().naive_utc();
    if token.expires_at < now {
        return error_response(
            StatusCode::FORBIDDEN,
            "ForbiddenOperationException",
            "Invalid token.",
        );
    }

    (
        StatusCode::NO_CONTENT,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct InvalidateRequest {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "clientToken")]
    #[allow(dead_code)]
    client_token: Option<String>,
}

pub async fn invalidate(
    State(state): State<Arc<AppState>>,
    Json(req): Json<InvalidateRequest>,
) -> Response {
    let access_hash = hash_token(&req.access_token);

    let _ = yggdrasil_tokens::Entity::delete_many()
        .filter(yggdrasil_tokens::Column::AccessTokenHash.eq(&access_hash))
        .exec(&state.db)
        .await;

    (
        StatusCode::NO_CONTENT,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct SignoutRequest {
    username: String,
    password: String,
}

pub async fn signout(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SignoutRequest>,
) -> Response {
    use argon2::{Argon2, PasswordHash, PasswordVerifier};

    let user = match users::Entity::find()
        .filter(users::Column::Email.eq(&req.username))
        .one(&state.db)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid credentials. Invalid username or password.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let parsed_hash = match PasswordHash::new(&user.password_hash) {
        Ok(hash) => hash,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Invalid password hash",
            );
        }
    };

    if Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .is_err()
    {
        return error_response(
            StatusCode::FORBIDDEN,
            "ForbiddenOperationException",
            "Invalid credentials. Invalid username or password.",
        );
    }

    let _ = yggdrasil_tokens::Entity::delete_many()
        .filter(yggdrasil_tokens::Column::Uid.eq(user.uid))
        .exec(&state.db)
        .await;

    (
        StatusCode::NO_CONTENT,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct JoinRequest {
    #[serde(rename = "accessToken")]
    access_token: String,
    #[serde(rename = "selectedProfile")]
    selected_profile: String,
    #[serde(rename = "serverId")]
    server_id: String,
}

pub async fn join(State(state): State<Arc<AppState>>, Json(req): Json<JoinRequest>) -> Response {
    let access_hash = hash_token(&req.access_token);

    let token = match yggdrasil_tokens::Entity::find()
        .filter(yggdrasil_tokens::Column::AccessTokenHash.eq(&access_hash))
        .one(&state.db)
        .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid token.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let now = chrono::Utc::now().naive_utc();
    if token.expires_at < now {
        return error_response(
            StatusCode::FORBIDDEN,
            "ForbiddenOperationException",
            "Invalid token.",
        );
    }

    let profile_uuid = req.selected_profile.replace("-", "");
    let formatted_uuid = format!(
        "{}-{}-{}-{}-{}",
        &profile_uuid[0..8],
        &profile_uuid[8..12],
        &profile_uuid[12..16],
        &profile_uuid[16..20],
        &profile_uuid[20..32]
    );

    let player = match players::Entity::find()
        .filter(players::Column::Uuid.eq(&formatted_uuid))
        .filter(players::Column::Uid.eq(token.uid))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return error_response(
                StatusCode::FORBIDDEN,
                "ForbiddenOperationException",
                "Invalid profile.",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let session = join_sessions::ActiveModel {
        profile_uuid: Set(player.uuid.clone()),
        server_id: Set(req.server_id),
        ip: Set(None),
        created_at: Set(now),
        ..Default::default()
    };

    if session.insert(&state.db).await.is_err() {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "InternalError",
            "Failed to create session",
        );
    }

    (
        StatusCode::NO_CONTENT,
        [(
            header::HeaderName::from_static("x-authlib-injector-api-location"),
            "/api/yggdrasil/",
        )],
    )
        .into_response()
}

#[derive(Deserialize)]
pub struct HasJoinedQuery {
    username: String,
    #[serde(rename = "serverId")]
    server_id: String,
    #[allow(dead_code)]
    ip: Option<String>,
}

pub async fn has_joined(
    State(state): State<Arc<AppState>>,
    Query(query): Query<HasJoinedQuery>,
) -> Response {
    let player = match players::Entity::find()
        .filter(players::Column::PlayerName.eq(&query.username))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (StatusCode::NO_CONTENT).into_response();
        }
        Err(_) => {
            return (StatusCode::NO_CONTENT).into_response();
        }
    };

    let session = match join_sessions::Entity::find()
        .filter(join_sessions::Column::ProfileUuid.eq(&player.uuid))
        .filter(join_sessions::Column::ServerId.eq(&query.server_id))
        .order_by_desc(join_sessions::Column::CreatedAt)
        .one(&state.db)
        .await
    {
        Ok(Some(s)) => s,
        Ok(None) => {
            return (StatusCode::NO_CONTENT).into_response();
        }
        Err(_) => {
            return (StatusCode::NO_CONTENT).into_response();
        }
    };

    let now = chrono::Utc::now().naive_utc();
    let session_age = now - session.created_at;
    if session_age.num_seconds() > 30 {
        return (StatusCode::NO_CONTENT).into_response();
    }

    let _ = join_sessions::Entity::delete_by_id(session.id)
        .exec(&state.db)
        .await;

    let profile = build_profile(&state, &player, false).await;
    add_api_header(Json(profile))
}

#[derive(Deserialize)]
pub struct ProfileQuery {
    unsigned: Option<bool>,
}

pub async fn get_profile(
    State(state): State<Arc<AppState>>,
    Path(uuid): Path<String>,
    Query(query): Query<ProfileQuery>,
) -> Response {
    let formatted_uuid = if uuid.contains('-') {
        uuid.clone()
    } else {
        format!(
            "{}-{}-{}-{}-{}",
            &uuid[0..8],
            &uuid[8..12],
            &uuid[12..16],
            &uuid[16..20],
            &uuid[20..32]
        )
    };

    let player = match players::Entity::find()
        .filter(players::Column::Uuid.eq(&formatted_uuid))
        .one(&state.db)
        .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return error_response(
                StatusCode::NO_CONTENT,
                "Not Found",
                "Profile not found",
            );
        }
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let unsigned = query.unsigned.unwrap_or(true);
    let profile = build_profile(&state, &player, !unsigned).await;
    add_api_header(Json(profile))
}

async fn build_profile(state: &AppState, player: &players::Model, signed: bool) -> Profile {
    let uuid_no_dash = player.uuid.replace("-", "");

    let mut skin_url: Option<String> = None;
    let mut cape_url: Option<String> = None;
    let mut skin_model: Option<String> = None;

    if let Some(tid) = player.tid_skin {
        if let Ok(Some(tex)) = textures::Entity::find_by_id(tid).one(&state.db).await {
            skin_url = Some(format!("{}/textures/{}", state.public_base_url, tex.hash));
            if tex.texture_type == "skin_slim" {
                skin_model = Some("slim".to_string());
            }
        }
    }

    if let Some(tid) = player.tid_cape {
        if let Ok(Some(tex)) = textures::Entity::find_by_id(tid).one(&state.db).await {
            cape_url = Some(format!("{}/textures/{}", state.public_base_url, tex.hash));
        }
    }

    let textures_value = build_textures_value(&uuid_no_dash, &player.player_name, skin_url, cape_url, skin_model);
    let textures_base64 = BASE64.encode(textures_value.as_bytes());

    let signature = if signed {
        sign_texture(&state.db, &textures_base64).await
    } else {
        None
    };

    Profile {
        id: uuid_no_dash,
        name: player.player_name.clone(),
        properties: Some(vec![Property {
            name: "textures".to_string(),
            value: textures_base64,
            signature,
        }]),
    }
}

fn build_textures_value(
    uuid: &str,
    name: &str,
    skin_url: Option<String>,
    cape_url: Option<String>,
    skin_model: Option<String>,
) -> String {
    let timestamp = chrono::Utc::now().timestamp_millis();

    let mut textures_obj = serde_json::json!({});

    if let Some(url) = skin_url {
        let mut skin_obj = serde_json::json!({ "url": url });
        if let Some(model) = skin_model {
            skin_obj["metadata"] = serde_json::json!({ "model": model });
        }
        textures_obj["SKIN"] = skin_obj;
    }

    if let Some(url) = cape_url {
        textures_obj["CAPE"] = serde_json::json!({ "url": url });
    }

    serde_json::json!({
        "timestamp": timestamp,
        "profileId": uuid,
        "profileName": name,
        "textures": textures_obj
    })
    .to_string()
}

async fn sign_texture(db: &DatabaseConnection, data: &str) -> Option<String> {
    let key = yggdrasil_keys::Entity::find()
        .order_by_desc(yggdrasil_keys::Column::CreatedAt)
        .one(db)
        .await
        .ok()??;

    let private_key = RsaPrivateKey::from_pkcs8_pem(&key.private_key_pem_encrypted).ok()?;
    let signing_key = SigningKey::<Sha1>::new(private_key);
    let signature = signing_key.sign(data.as_bytes());
    Some(BASE64.encode(signature.to_bytes()))
}

#[derive(Serialize)]
pub struct PublicKeysResponse {
    #[serde(rename = "playerCertificateKeys")]
    player_certificate_keys: Vec<PublicKeyEntry>,
    #[serde(rename = "profilePropertyKeys")]
    profile_property_keys: Vec<PublicKeyEntry>,
}

#[derive(Serialize, Clone)]
pub struct PublicKeyEntry {
    #[serde(rename = "publicKey")]
    public_key: String,
}

pub async fn public_keys(State(state): State<Arc<AppState>>) -> Response {
    let keys = match yggdrasil_keys::Entity::find()
        .order_by_desc(yggdrasil_keys::Column::CreatedAt)
        .all(&state.db)
        .await
    {
        Ok(k) => k,
        Err(_) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "InternalError",
                "Database error",
            );
        }
    };

    let key_entries: Vec<PublicKeyEntry> = keys
        .into_iter()
        .filter_map(|k| {
            let pem = k.public_key_pem;
            let pubkey = RsaPublicKey::from_public_key_pem(&pem).ok()?;
            let der = rsa::pkcs8::EncodePublicKey::to_public_key_der(&pubkey).ok()?;
            Some(PublicKeyEntry {
                public_key: BASE64.encode(der.as_bytes()),
            })
        })
        .collect();

    add_api_header(Json(PublicKeysResponse {
        player_certificate_keys: key_entries.clone(),
        profile_property_keys: key_entries,
    }))
}

pub async fn bulk_profiles(
    State(state): State<Arc<AppState>>,
    Json(names): Json<Vec<String>>,
) -> Response {
    if names.len() > 10 {
        return error_response(
            StatusCode::BAD_REQUEST,
            "IllegalArgumentException",
            "Too many names requested",
        );
    }

    let mut profiles = Vec::new();

    for name in names {
        if let Ok(Some(player)) = players::Entity::find()
            .filter(players::Column::PlayerName.eq(&name))
            .one(&state.db)
            .await
        {
            profiles.push(Profile {
                id: player.uuid.replace("-", ""),
                name: player.player_name,
                properties: None,
            });
        }
    }

    add_api_header(Json(profiles))
}
