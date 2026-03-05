use axum::{extract::State, routing::get, Json, Router};
use sea_orm::{EntityTrait, PaginatorTrait};
use serde::Serialize;
use std::sync::Arc;

use crate::{ApiResponse, AppState};
use entity::{players as player_entity, site_settings, textures as texture_entity, users};

#[derive(Serialize)]
struct HealthData {
    status: String,
}

#[derive(Serialize)]
struct SiteStatsData {
    total_users: i64,
    total_textures: i64,
    total_players: i64,
}

#[derive(Serialize)]
struct UserStatsData {
    score: i64,
    player_count: i64,
    texture_count: i64,
    closet_count: i64,
}

#[derive(Serialize)]
struct PublicSiteSettingsData {
    site_name: String,
    site_description: String,
    site_url: String,
    logo_url: Option<String>,
    favicon_url: Option<String>,
    theme_color: String,
    footer_text: String,
    allow_register: Option<bool>,
    require_email_verification: Option<bool>,
}

async fn health_check() -> Json<ApiResponse<HealthData>> {
    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: HealthData {
            status: "ok".to_string(),
        },
    })
}

async fn stats_handler(State(state): State<Arc<AppState>>) -> Json<ApiResponse<SiteStatsData>> {
    let total_users = users::Entity::find().count(&state.db).await.unwrap_or(0);
    let total_textures = texture_entity::Entity::find()
        .count(&state.db)
        .await
        .unwrap_or(0);
    let total_players = player_entity::Entity::find()
        .count(&state.db)
        .await
        .unwrap_or(0);

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: SiteStatsData {
            total_users: total_users as i64,
            total_textures: total_textures as i64,
            total_players: total_players as i64,
        },
    })
}

async fn user_stats_handler(State(_state): State<Arc<AppState>>) -> Json<ApiResponse<UserStatsData>> {
    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: UserStatsData {
            score: 0,
            player_count: 0,
            texture_count: 0,
            closet_count: 0,
        },
    })
}

async fn public_site_settings_handler(
    State(state): State<Arc<AppState>>,
) -> Json<ApiResponse<PublicSiteSettingsData>> {
    let settings = site_settings::Entity::find().one(&state.db).await.ok().flatten();

    let data = if let Some(model) = settings {
        PublicSiteSettingsData {
            site_name: model.site_name,
            site_description: model.site_description,
            site_url: model.site_url,
            logo_url: model.logo_url,
            favicon_url: model.favicon_url,
            theme_color: model.theme_color,
            footer_text: model.footer_text,
            allow_register: model.allow_register,
            require_email_verification: model.require_email_verification,
        }
    } else {
        PublicSiteSettingsData {
            site_name: "CraftSkin".to_string(),
            site_description: "发现、下载和分享精美的 Minecraft 皮肤".to_string(),
            site_url: "http://localhost:3000".to_string(),
            logo_url: None,
            favicon_url: None,
            theme_color: "#2E7D32".to_string(),
            footer_text: "© 2024 CraftSkin. All rights reserved.".to_string(),
            allow_register: Some(true),
            require_email_verification: Some(false),
        }
    };

    Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data,
    })
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/health", get(health_check))
        .route("/site-settings", get(public_site_settings_handler))
        .route("/stats", get(stats_handler))
        .route("/user/stats", get(user_stats_handler))
}
