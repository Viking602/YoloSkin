mod api;
mod public;
mod static_files;

use axum::{routing::get, Router};
use std::sync::Arc;
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};

use crate::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .nest("/api", api::router())
        .route("/textures/:hash", get(static_files::serve_texture))
        .nest_service("/", ServeDir::new("web/out"))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
