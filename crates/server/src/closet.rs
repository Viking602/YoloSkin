use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{session::AuthUser, AppState};
use entity::{closet_items, textures};

#[derive(Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    message: String,
    data: T,
}

#[derive(Serialize)]
pub struct ClosetItem {
    tid: i32,
    name: String,
    #[serde(rename = "type")]
    texture_type: String,
    url: String,
    added_at: String,
}

#[derive(Deserialize)]
pub struct AddClosetRequest {
    tid: i32,
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_closet))
        .route("/", post(add_to_closet))
        .route("/{tid}", delete(remove_from_closet))
}

async fn list_closet(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<ClosetItem>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let items = closet_items::Entity::find()
        .filter(closet_items::Column::Uid.eq(uid))
        .find_also_related(textures::Entity)
        .all(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 500,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    let closet_items: Vec<ClosetItem> = items
        .into_iter()
        .filter_map(|(item, texture)| {
            texture.map(|t| ClosetItem {
                tid: t.tid,
                name: t.name,
                texture_type: t.texture_type,
                url: format!("/textures/{}", t.hash),
                added_at: item.added_at.to_string(),
            })
        })
        .collect();

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: closet_items,
    }))
}

async fn add_to_closet(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<AddClosetRequest>,
) -> Result<Json<ApiResponse<ClosetItem>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let texture = textures::Entity::find_by_id(req.tid)
        .one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 500,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    let texture = texture.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Texture not found".to_string(),
                data: (),
            }),
        )
    })?;

    let existing = closet_items::Entity::find()
        .filter(closet_items::Column::Uid.eq(uid))
        .filter(closet_items::Column::Tid.eq(req.tid))
        .one(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 500,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    if existing.is_some() {
        return Err((
            StatusCode::CONFLICT,
            Json(ApiResponse {
                code: 409,
                message: "Texture already in closet".to_string(),
                data: (),
            }),
        ));
    }

    let now = chrono::Utc::now().naive_utc();
    let new_item = closet_items::ActiveModel {
        uid: Set(uid),
        tid: Set(req.tid),
        added_at: Set(now),
    };

    new_item.insert(&state.db).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Database error: {}", e),
                data: (),
            }),
        )
    })?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: ClosetItem {
            tid: texture.tid,
            name: texture.name,
            texture_type: texture.texture_type,
            url: format!("/textures/{}", texture.hash),
            added_at: now.to_string(),
        },
    }))
}

async fn remove_from_closet(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(tid): Path<i32>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let result = closet_items::Entity::delete_many()
        .filter(closet_items::Column::Uid.eq(uid))
        .filter(closet_items::Column::Tid.eq(tid))
        .exec(&state.db)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 500,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;

    if result.rows_affected == 0 {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Item not found in closet".to_string(),
                data: (),
            }),
        ));
    }

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    }))
}
