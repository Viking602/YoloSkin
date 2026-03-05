use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;

use crate::{admin, auth, closet, players, premium, textures, yggdrasil, AppState};

use super::public;

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .merge(public::router())
        .route("/auth/login", post(auth::login))
        .route("/auth/register", post(auth::register))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/forgot", post(auth::forgot_password))
        .route("/auth/verify", post(auth::verify_email))
        .route("/auth/reset", post(auth::reset_password))
        .route("/auth/oauth/providers", get(auth::oauth_providers))
        .route("/auth/oauth/{provider}/start", get(auth::oauth_start))
        .route("/auth/oauth/{provider}/callback", get(auth::oauth_callback))
        .route("/user", get(auth::get_user))
        .nest("/user/players", players::router())
        .nest("/user/textures", textures::router())
        .nest("/user/closet", closet::router())
        .nest("/user/premium", premium::router())
        .nest("/admin", admin::router())
        .nest("/yggdrasil", yggdrasil::router())
}
