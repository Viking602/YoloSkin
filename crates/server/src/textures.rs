use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    routing::{delete, get, post},
    Json, Router,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tokio::{fs, io::AsyncWriteExt};

use crate::{session::AuthUser, AppState};
use entity::{players, textures};

#[derive(Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    message: String,
    data: T,
}

#[derive(Serialize)]
pub struct TextureResponse {
    tid: i32,
    name: String,
    #[serde(rename = "type")]
    texture_type: String,
    hash: String,
    size: i32,
    uploader_uid: i32,
    public: bool,
    upload_at: String,
    likes: i32,
}

impl From<textures::Model> for TextureResponse {
    fn from(model: textures::Model) -> Self {
        Self {
            tid: model.tid,
            name: model.name,
            texture_type: model.texture_type,
            hash: model.hash,
            size: model.size,
            uploader_uid: model.uploader_uid,
            public: model.public,
            upload_at: model.upload_at.to_string(),
            likes: model.likes,
        }
    }
}

#[derive(Serialize)]
pub struct TextureListResponse {
    items: Vec<TextureResponse>,
    total: u64,
    page: u64,
    page_size: u64,
}

#[derive(Deserialize)]
pub struct ListTexturesQuery {
    #[serde(rename = "type")]
    texture_type: Option<String>,
    page: Option<u64>,
    #[serde(rename = "pageSize")]
    page_size: Option<u64>,
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", get(list_textures))
        .route("/", post(upload_texture))
        .route("/{tid}", get(get_texture))
        .route("/{tid}", delete(delete_texture))
}

async fn list_textures(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<ListTexturesQuery>,
) -> Result<Json<ApiResponse<TextureListResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let mut select = textures::Entity::find().filter(textures::Column::UploaderUid.eq(uid));

    if let Some(ref t) = query.texture_type {
        select = select.filter(textures::Column::TextureType.eq(t));
    }

    let paginator = select
        .order_by_desc(textures::Column::UploadAt)
        .paginate(&state.db, page_size);

    let total = paginator.num_items().await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Database error: {}", e),
                data: (),
            }),
        )
    })?;

    let items = paginator.fetch_page(page - 1).await.map_err(|e| {
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
        data: TextureListResponse {
            items: items.into_iter().map(TextureResponse::from).collect(),
            total,
            page,
            page_size,
        },
    }))
}

async fn get_texture(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(tid): Path<i32>,
) -> Result<Json<ApiResponse<TextureResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let texture = textures::Entity::find_by_id(tid)
        .filter(textures::Column::UploaderUid.eq(uid))
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

    match texture {
        Some(t) => Ok(Json(ApiResponse {
            code: 0,
            message: "success".to_string(),
            data: TextureResponse::from(t),
        })),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "Texture not found".to_string(),
                data: (),
            }),
        )),
    }
}

async fn upload_texture(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<TextureResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let mut name: Option<String> = None;
    let mut texture_type: Option<String> = None;
    let mut public: bool = false;
    let mut file_data: Option<Vec<u8>> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                code: 400,
                message: format!("Failed to read multipart: {}", e),
                data: (),
            }),
        )
    })? {
        let field_name = field.name().unwrap_or("").to_string();
        match field_name.as_str() {
            "name" => {
                name = Some(field.text().await.map_err(|e| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(ApiResponse {
                            code: 400,
                            message: format!("Failed to read name: {}", e),
                            data: (),
                        }),
                    )
                })?);
            }
            "type" => {
                texture_type = Some(field.text().await.map_err(|e| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(ApiResponse {
                            code: 400,
                            message: format!("Failed to read type: {}", e),
                            data: (),
                        }),
                    )
                })?);
            }
            "public" => {
                let val = field.text().await.unwrap_or_default();
                public = val == "true" || val == "1";
            }
            "file" => {
                file_data = Some(field.bytes().await.map_err(|e| {
                    (
                        StatusCode::BAD_REQUEST,
                        Json(ApiResponse {
                            code: 400,
                            message: format!("Failed to read file: {}", e),
                            data: (),
                        }),
                    )
                })?.to_vec());
            }
            _ => {}
        }
    }

    let name = name.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                code: 400,
                message: "Missing name field".to_string(),
                data: (),
            }),
        )
    })?;

    let texture_type = texture_type.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                code: 400,
                message: "Missing type field".to_string(),
                data: (),
            }),
        )
    })?;

    let file_data = file_data.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiResponse {
                code: 400,
                message: "Missing file field".to_string(),
                data: (),
            }),
        )
    })?;

    let mut hasher = Sha256::new();
    hasher.update(&file_data);
    let hash = format!("{:x}", hasher.finalize());

    let textures_dir = state.data_dir.join("textures");
    fs::create_dir_all(&textures_dir).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Failed to create textures directory: {}", e),
                data: (),
            }),
        )
    })?;

    let file_path = textures_dir.join(&hash);
    let mut file = fs::File::create(&file_path).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Failed to create file: {}", e),
                data: (),
            }),
        )
    })?;

    file.write_all(&file_data).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Failed to write file: {}", e),
                data: (),
            }),
        )
    })?;

    let new_texture = textures::ActiveModel {
        name: Set(name),
        texture_type: Set(texture_type),
        hash: Set(hash),
        size: Set(file_data.len() as i32),
        uploader_uid: Set(uid),
        public: Set(public),
        upload_at: Set(chrono::Utc::now().naive_utc()),
        likes: Set(0),
        ..Default::default()
    };

    let texture = new_texture.insert(&state.db).await.map_err(|e| {
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
        data: TextureResponse::from(texture),
    }))
}

async fn delete_texture(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(tid): Path<i32>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    let uid = auth_user.uid;

    let texture = textures::Entity::find_by_id(tid)
        .filter(textures::Column::UploaderUid.eq(uid))
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

    let mut players_to_reset = if texture.texture_type == "cape" {
        players::Entity::find()
            .filter(players::Column::TidCape.eq(tid))
            .all(&state.db)
            .await
    } else {
        players::Entity::find()
            .filter(players::Column::TidSkin.eq(tid))
            .all(&state.db)
            .await
    }
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

    for player in players_to_reset.drain(..) {
        let mut active_model: players::ActiveModel = player.into();
        if texture.texture_type == "cape" {
            active_model.tid_cape = Set(None);
        } else {
            active_model.tid_skin = Set(None);
        }

        active_model.update(&state.db).await.map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse {
                    code: 500,
                    message: format!("Database error: {}", e),
                    data: (),
                }),
            )
        })?;
    }

    let file_path = state.data_dir.join("textures").join(&texture.hash);
    let _ = fs::remove_file(&file_path).await;

    textures::Entity::delete_by_id(tid)
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
