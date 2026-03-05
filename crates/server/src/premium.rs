use axum::{
    extract::State,
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;

use crate::{session::AuthUser, AppState};
use entity::premium_bindings;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    message: String,
    data: T,
}

#[derive(Serialize)]
pub struct PremiumBinding {
    uuid: String,
    username: String,
    bound_at: String,
}

#[derive(Deserialize)]
pub struct BindPremiumRequest {
    microsoft_token: String,
}

#[derive(Serialize)]
pub struct SyncResult {
    synced: bool,
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(get_premium_binding))
        .route("/", post(bind_premium))
        .route("/", delete(unbind_premium))
        .route("/sync", post(sync_premium_skin))
}

async fn get_premium_binding(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Option<PremiumBinding>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let binding = premium_bindings::Entity::find_by_id(uid)
        .one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    let data = binding.map(|item| PremiumBinding {
        uuid: item.uuid,
        username: item.username,
        bound_at: item.bound_at.to_string(),
    });

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data,
    }))
}

async fn bind_premium(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<BindPremiumRequest>,
) -> Result<Json<ApiResponse<PremiumBinding>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let mut hasher = Sha256::new();
    hasher.update(req.microsoft_token.as_bytes());
    let token_hash = hex::encode(hasher.finalize());

    let now = chrono::Utc::now().naive_utc();
    let binding = if let Some(existing) = premium_bindings::Entity::find_by_id(uid)
        .one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?
    {
        let mut active: premium_bindings::ActiveModel = existing.into();
        active.uuid = Set("placeholder-uuid".to_string());
        active.username = Set("PlaceholderUser".to_string());
        active.bound_at = Set(now);
        active.token_hash = Set(Some(token_hash));
        active.update(&state.db).await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?
    } else {
        let active = premium_bindings::ActiveModel {
            uid: Set(uid),
            uuid: Set("placeholder-uuid".to_string()),
            username: Set("PlaceholderUser".to_string()),
            bound_at: Set(now),
            token_hash: Set(Some(token_hash)),
        };

        active.insert(&state.db).await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?
    };

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: PremiumBinding {
            uuid: binding.uuid,
            username: binding.username,
            bound_at: binding.bound_at.to_string(),
        },
    }))
}

async fn unbind_premium(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    premium_bindings::Entity::delete_by_id(uid)
        .exec(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    }))
}

async fn sync_premium_skin(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<SyncResult>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let exists = premium_bindings::Entity::find_by_id(uid)
        .one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 1,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?
        .is_some();

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: SyncResult { synced: exists },
    }))
}
