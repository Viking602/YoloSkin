use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use std::sync::Arc;

use crate::AppState;

pub async fn serve_texture(State(state): State<Arc<AppState>>, Path(hash): Path<String>) -> Response {
    let texture_path = state.data_dir.join("textures").join(&hash);

    match tokio::fs::read(&texture_path).await {
        Ok(data) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "image/png"),
                (header::CACHE_CONTROL, "public, max-age=31536000, immutable"),
                (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
            ],
            data,
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Texture not found").into_response(),
    }
}
