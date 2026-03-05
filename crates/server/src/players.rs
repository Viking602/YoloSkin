use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, post, put},
    Json, Router,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::{session::AuthUser, AppState};
use entity::players;

#[derive(Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    message: String,
    data: T,
}

#[derive(Serialize)]
pub struct PlayerResponse {
    pid: i32,
    player_name: String,
    uuid: String,
    tid_skin: Option<i32>,
    tid_cape: Option<i32>,
    created_at: String,
}

impl From<players::Model> for PlayerResponse {
    fn from(model: players::Model) -> Self {
        Self {
            pid: model.pid,
            player_name: model.player_name,
            uuid: model.uuid,
            tid_skin: model.tid_skin,
            tid_cape: model.tid_cape,
            created_at: model.created_at.to_string(),
        }
    }
}

#[derive(Deserialize)]
pub struct CreatePlayerRequest {
    player_name: String,
}

#[derive(Deserialize)]
pub struct UpdatePlayerRequest {
    player_name: Option<String>,
    tid_skin: Option<Option<i32>>,
    tid_cape: Option<Option<i32>>,
}

fn player_name_conflict_response() -> (StatusCode, Json<ApiResponse<()>>) {
    (
        StatusCode::CONFLICT,
        Json(ApiResponse {
            code: 409,
            message: "Player name already exists".to_string(),
            data: (),
        }),
    )
}

fn bad_request_response(message: impl Into<String>) -> (StatusCode, Json<ApiResponse<()>>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ApiResponse {
            code: 400,
            message: message.into(),
            data: (),
        }),
    )
}

fn is_player_name_unique_violation(error: &DbErr) -> bool {
    let message = error.to_string().to_lowercase();
    message.contains("uq_players_player_name")
        || message.contains("players_player_name_key")
        || (message.contains("unique") && message.contains("player_name"))
}

fn database_error_response(error: DbErr) -> (StatusCode, Json<ApiResponse<()>>) {
    if is_player_name_unique_violation(&error) {
        return player_name_conflict_response();
    }

    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(ApiResponse {
            code: 500,
            message: format!("Database error: {}", error),
            data: (),
        }),
    )
}

fn default_skin_tid_for_new_player() -> Option<i32> {
    None
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_players))
        .route("/", post(create_player))
        .route("/{pid}", get(get_player))
        .route("/{pid}", put(update_player))
        .route("/{pid}", delete(delete_player))
}

async fn list_players(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<Vec<PlayerResponse>>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let players = players::Entity::find()
        .filter(players::Column::Uid.eq(uid))
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

    let response: Vec<PlayerResponse> = players.into_iter().map(PlayerResponse::from).collect();

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: response,
    }))
}

async fn get_player(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(pid): Path<i32>,
) -> Result<Json<ApiResponse<PlayerResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let player = players::Entity::find_by_id(pid)
        .filter(players::Column::Uid.eq(uid))
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

    match player {
        Some(p) => Ok(Json(ApiResponse {
            code: 0,
            message: "success".to_string(),
            data: PlayerResponse::from(p),
        })),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Player not found".to_string(),
                data: (),
            }),
        )),
    }
}

async fn create_player(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(payload): Json<CreatePlayerRequest>,
) -> Result<Json<ApiResponse<PlayerResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;
    let player_name = payload.player_name.trim().to_string();

    if player_name.is_empty() {
        return Err(bad_request_response("Player name cannot be empty"));
    }

    let duplicated_player = players::Entity::find()
        .filter(players::Column::PlayerName.eq(player_name.clone()))
        .one(&state.db)
        .await
        .map_err(database_error_response)?;

    if duplicated_player.is_some() {
        return Err(player_name_conflict_response());
    }

    // Generate UUID v4 without dashes for Yggdrasil compatibility
    let uuid = Uuid::new_v4().to_string().replace("-", "");

    let new_player = players::ActiveModel {
        uid: Set(uid),
        player_name: Set(player_name),
        uuid: Set(uuid),
        tid_skin: Set(default_skin_tid_for_new_player()),
        tid_cape: Set(None),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let player = new_player
        .insert(&state.db)
        .await
        .map_err(database_error_response)?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: PlayerResponse::from(player),
    }))
}

async fn update_player(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(pid): Path<i32>,
    Json(payload): Json<UpdatePlayerRequest>,
) -> Result<Json<ApiResponse<PlayerResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let existing = players::Entity::find_by_id(pid)
        .filter(players::Column::Uid.eq(uid))
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
        })?
        .ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Player not found".to_string(),
                data: (),
            }),
        )
    })?;

    let mut active_model: players::ActiveModel = existing.into();

    if let Some(name) = payload.player_name {
        let normalized_name = name.trim().to_string();

        if normalized_name.is_empty() {
            return Err(bad_request_response("Player name cannot be empty"));
        }

        let duplicated_player = players::Entity::find()
            .filter(players::Column::PlayerName.eq(normalized_name.clone()))
            .filter(players::Column::Pid.ne(pid))
            .one(&state.db)
            .await
            .map_err(database_error_response)?;

        if duplicated_player.is_some() {
            return Err(player_name_conflict_response());
        }

        active_model.player_name = Set(normalized_name);
    }
    if let Some(tid_skin) = payload.tid_skin {
        active_model.tid_skin = Set(tid_skin);
    }
    if let Some(tid_cape) = payload.tid_cape {
        active_model.tid_cape = Set(tid_cape);
    }

    let updated = active_model
        .update(&state.db)
        .await
        .map_err(database_error_response)?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: PlayerResponse::from(updated),
    }))
}

async fn delete_player(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(pid): Path<i32>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let existing = players::Entity::find_by_id(pid)
        .filter(players::Column::Uid.eq(uid))
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

    if existing.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Player not found".to_string(),
                data: (),
            }),
        ));
    }

    players::Entity::delete_by_id(pid)
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

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: (),
    }))
}
