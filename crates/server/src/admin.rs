use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{delete, get, put},
    Json, Router,
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use std::env;
use std::sync::Arc;

use crate::{session::AuthUser, AppState};
use entity::{audit_logs, site_settings, textures, users};

#[derive(Serialize)]
pub struct ApiResponse<T> {
    code: i32,
    message: String,
    data: T,
}

#[derive(Serialize)]
pub struct PaginatedResponse<T> {
    items: Vec<T>,
    total: u64,
    page: u64,
    page_size: u64,
}

async fn require_admin(
    state: &Arc<AppState>,
    uid: i32,
) -> Result<(), (StatusCode, Json<ApiResponse<()>>)> {
    let user = users::Entity::find_by_id(uid)
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

    let is_admin = user.and_then(|u| u.is_admin).unwrap_or(false);
    if !is_admin {
        return Err((
            StatusCode::FORBIDDEN,
            Json(ApiResponse {
                code: 403,
                message: "Admin access required".to_string(),
                data: (),
            }),
        ));
    }

    Ok(())
}

#[derive(Deserialize)]
pub struct ListUsersQuery {
    page: Option<u64>,
    #[serde(rename = "pageSize")]
    page_size: Option<u64>,
    search: Option<String>,
}

#[derive(Serialize)]
pub struct UsersStatsResponse {
    total_users: u64,
    verified_users: u64,
    vip_users: u64,
    admin_users: u64,
}

#[derive(Serialize)]
pub struct UserResponse {
    uid: i32,
    email: String,
    nickname: String,
    avatar: Option<String>,
    score: Option<i32>,
    permission: Option<i32>,
    verified: Option<bool>,
    register_at: String,
    last_sign_at: Option<String>,
    is_admin: Option<bool>,
}

impl From<users::Model> for UserResponse {
    fn from(model: users::Model) -> Self {
        Self {
            uid: model.uid,
            email: model.email,
            nickname: model.nickname,
            avatar: model.avatar,
            score: model.score,
            permission: model.permission,
            verified: model.verified,
            register_at: model.register_at.to_string(),
            last_sign_at: model.last_sign_at.map(|d| d.to_string()),
            is_admin: model.is_admin,
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    nickname: Option<String>,
    email: Option<String>,
    score: Option<i32>,
    permission: Option<i32>,
    verified: Option<bool>,
    is_admin: Option<bool>,
}

async fn list_users(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<UserResponse>>>, (StatusCode, Json<ApiResponse<()>>)> 
{
    require_admin(&state, auth_user.uid).await?;

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let mut select = users::Entity::find();

    if let Some(ref search) = query.search {
        select = select.filter(
            users::Column::Email
                .contains(search)
                .or(users::Column::Nickname.contains(search)),
        );
    }

    let paginator = select
        .order_by_desc(users::Column::RegisterAt)
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
        data: PaginatedResponse {
            items: items.into_iter().map(UserResponse::from).collect(),
            total,
            page,
            page_size,
        },
    }))
}

async fn get_users_stats(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<UsersStatsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let total_users = users::Entity::find().count(&state.db).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Database error: {}", e),
                data: (),
            }),
        )
    })?;

    let verified_users = users::Entity::find()
        .filter(users::Column::Verified.eq(true))
        .count(&state.db)
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

    let vip_users = users::Entity::find()
        .filter(users::Column::Permission.gte(1))
        .count(&state.db)
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

    let admin_users = users::Entity::find()
        .filter(users::Column::IsAdmin.eq(true))
        .count(&state.db)
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
        data: UsersStatsResponse {
            total_users,
            verified_users,
            vip_users,
            admin_users,
        },
    }))
}

async fn update_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(uid): Path<i32>,
    Json(req): Json<UpdateUserRequest>,
) -> Result<Json<ApiResponse<UserResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let user = users::Entity::find_by_id(uid)
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

    let user = user.ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiResponse {
                code: 404,
                message: "User not found".to_string(),
                data: (),
            }),
        )
    })?;

    let mut active: users::ActiveModel = user.into();

    if let Some(nickname) = req.nickname {
        active.nickname = Set(nickname);
    }
    if let Some(email) = req.email {
        active.email = Set(email);
    }
    if let Some(score) = req.score {
        active.score = Set(Some(score));
    }
    if let Some(permission) = req.permission {
        active.permission = Set(Some(permission));
    }
    if let Some(verified) = req.verified {
        active.verified = Set(Some(verified));
    }
    if let Some(is_admin) = req.is_admin {
        active.is_admin = Set(Some(is_admin));
    }

    let updated = active.update(&state.db).await.map_err(|e| {
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
        data: UserResponse::from(updated),
    }))
}

async fn delete_user(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(uid): Path<i32>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let result = users::Entity::delete_by_id(uid)
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
                message: "User not found".to_string(),
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

#[derive(Deserialize)]
pub struct ListTexturesQuery {
    page: Option<u64>,
    #[serde(rename = "pageSize")]
    page_size: Option<u64>,
    #[serde(rename = "type")]
    texture_type: Option<String>,
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

async fn list_textures(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<ListTexturesQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<TextureResponse>>>, (StatusCode, Json<ApiResponse<()>>)> 
{
    require_admin(&state, auth_user.uid).await?;

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let mut select = textures::Entity::find();

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
        data: PaginatedResponse {
            items: items.into_iter().map(TextureResponse::from).collect(),
            total,
            page,
            page_size,
        },
    }))
}

async fn delete_texture(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Path(tid): Path<i32>,
) -> Result<Json<ApiResponse<()>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let texture = textures::Entity::find_by_id(tid)
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

    let file_path = state.data_dir.join("textures").join(&texture.hash);
    let _ = tokio::fs::remove_file(&file_path).await;

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

#[derive(Deserialize)]
pub struct ListAuditLogsQuery {
    page: Option<u64>,
    #[serde(rename = "pageSize")]
    page_size: Option<u64>,
    action: Option<String>,
}

#[derive(Serialize)]
pub struct AuditLogResponse {
    id: i32,
    user_id: Option<i32>,
    user_email: String,
    action: String,
    ip: String,
    user_agent: String,
    created_at: String,
    details: Option<serde_json::Value>,
}

impl From<audit_logs::Model> for AuditLogResponse {
    fn from(model: audit_logs::Model) -> Self {
        Self {
            id: model.id,
            user_id: model.user_id,
            user_email: model.user_email,
            action: model.action,
            ip: model.ip,
            user_agent: model.user_agent,
            created_at: model.created_at.to_string(),
            details: model.details,
        }
    }
}

async fn list_audit_logs(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Query(query): Query<ListAuditLogsQuery>,
) -> Result<Json<ApiResponse<PaginatedResponse<AuditLogResponse>>>, (StatusCode, Json<ApiResponse<()>>)> 
{
    require_admin(&state, auth_user.uid).await?;

    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);

    let mut select = audit_logs::Entity::find();

    if let Some(ref action) = query.action {
        select = select.filter(audit_logs::Column::Action.eq(action));
    }

    let paginator = select
        .order_by_desc(audit_logs::Column::CreatedAt)
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
        data: PaginatedResponse {
            items: items.into_iter().map(AuditLogResponse::from).collect(),
            total,
            page,
            page_size,
        },
    }))
}

#[derive(Serialize)]
pub struct SiteSettingsResponse {
    id: i32,
    site_name: String,
    site_description: String,
    site_url: String,
    logo_url: Option<String>,
    favicon_url: Option<String>,
    theme_color: String,
    footer_text: String,
    allow_register: Option<bool>,
    require_email_verification: Option<bool>,
    default_score: Option<i32>,
    score_per_storage: Option<i32>,
    score_per_closet_item: Option<i32>,
    score_per_player: Option<i32>,
}

impl From<site_settings::Model> for SiteSettingsResponse {
    fn from(model: site_settings::Model) -> Self {
        Self {
            id: model.id,
            site_name: model.site_name,
            site_description: model.site_description,
            site_url: model.site_url,
            logo_url: model.logo_url,
            favicon_url: model.favicon_url,
            theme_color: model.theme_color,
            footer_text: model.footer_text,
            allow_register: model.allow_register,
            require_email_verification: model.require_email_verification,
            default_score: model.default_score,
            score_per_storage: model.score_per_storage,
            score_per_closet_item: model.score_per_closet_item,
            score_per_player: model.score_per_player,
        }
    }
}

#[derive(Deserialize)]
pub struct UpdateSiteSettingsRequest {
    site_name: Option<String>,
    site_description: Option<String>,
    site_url: Option<String>,
    logo_url: Option<String>,
    favicon_url: Option<String>,
    theme_color: Option<String>,
    footer_text: Option<String>,
    allow_register: Option<bool>,
    require_email_verification: Option<bool>,
    default_score: Option<i32>,
    score_per_storage: Option<i32>,
    score_per_closet_item: Option<i32>,
    score_per_player: Option<i32>,
}

#[derive(Serialize)]
pub struct OAuthSettingsResponse {
    google_client_id: Option<String>,
    microsoft_client_id: Option<String>,
    google_enabled: bool,
    microsoft_enabled: bool,
    has_google_client_secret: bool,
    has_microsoft_client_secret: bool,
    has_oauth_state_secret: bool,
}

#[derive(Deserialize)]
pub struct UpdateOAuthSettingsRequest {
    google_client_id: Option<String>,
    google_client_secret: Option<String>,
    microsoft_client_id: Option<String>,
    microsoft_client_secret: Option<String>,
    oauth_state_secret: Option<String>,
}

#[derive(Serialize)]
pub struct EmailSettingsResponse {
    smtp_host: Option<String>,
    smtp_port: Option<i32>,
    smtp_username: Option<String>,
    smtp_from_name: Option<String>,
    smtp_from_email: Option<String>,
    smtp_use_tls: bool,
    smtp_enabled: bool,
    has_smtp_password: bool,
    email_template_subject: String,
    email_template_html: String,
}

#[derive(Deserialize)]
pub struct UpdateEmailSettingsRequest {
    smtp_host: Option<String>,
    smtp_port: Option<i32>,
    smtp_username: Option<String>,
    smtp_password: Option<String>,
    smtp_from_name: Option<String>,
    smtp_from_email: Option<String>,
    smtp_use_tls: Option<bool>,
    email_template_subject: Option<String>,
    email_template_html: Option<String>,
}

async fn get_or_create_site_settings(
    state: &Arc<AppState>,
) -> Result<site_settings::Model, (StatusCode, Json<ApiResponse<()>>)> {
    if let Some(settings) = site_settings::Entity::find()
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
    {
        return Ok(settings);
    }

    let active = site_settings::ActiveModel {
        site_name: Set("CraftSkin".to_string()),
        site_description: Set("发现、下载和分享精美的 Minecraft 皮肤".to_string()),
        site_url: Set("http://localhost:3000".to_string()),
        logo_url: Set(None),
        favicon_url: Set(None),
        theme_color: Set("#2E7D32".to_string()),
        footer_text: Set("© 2024 CraftSkin. All rights reserved.".to_string()),
        allow_register: Set(Some(true)),
        require_email_verification: Set(Some(false)),
        default_score: Set(Some(0)),
        score_per_storage: Set(Some(0)),
        score_per_closet_item: Set(Some(0)),
        score_per_player: Set(Some(0)),
        google_client_id: Set(None),
        google_client_secret: Set(None),
        microsoft_client_id: Set(None),
        microsoft_client_secret: Set(None),
        oauth_state_secret: Set(None),
        smtp_host: Set(None),
        smtp_port: Set(None),
        smtp_username: Set(None),
        smtp_password: Set(None),
        smtp_from_name: Set(None),
        smtp_from_email: Set(None),
        smtp_use_tls: Set(Some(true)),
        email_template_subject: Set(Some("【CraftSkin】账户通知".to_string())),
        email_template_html: Set(Some(default_email_template_html())),
        ..Default::default()
    };

    active.insert(&state.db).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiResponse {
                code: 500,
                message: format!("Database error: {}", e),
                data: (),
            }),
        )
    })
}

fn get_env_i32(name: &str) -> Option<i32> {
    get_env_non_empty(name).and_then(|v| v.parse::<i32>().ok())
}

fn get_env_bool(name: &str) -> Option<bool> {
    get_env_non_empty(name).and_then(|v| match v.to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    })
}

fn default_email_template_subject() -> String {
    "【CraftSkin】账户通知".to_string()
}

fn default_email_template_html() -> String {
    "<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /></head><body style=\"margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif;\"><table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" style=\"padding:24px 0;\"><tr><td align=\"center\"><table role=\"presentation\" width=\"640\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width:640px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;\"><tr><td style=\"background:#2E7D32;color:#fff;padding:16px 20px;font-size:18px;font-weight:700;\">CraftSkin</td></tr><tr><td style=\"padding:24px 20px;color:#1f2937;line-height:1.7;font-size:14px;\">{{content}}</td></tr><tr><td style=\"padding:14px 20px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;\">此邮件由系统自动发送，请勿直接回复。</td></tr></table></td></tr></table></body></html>".to_string()
}

fn get_env_non_empty(name: &str) -> Option<String> {
    env::var(name)
        .ok()
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

fn has_non_empty(value: Option<&String>) -> bool {
    value
        .map(|v| !v.trim().is_empty())
        .unwrap_or(false)
}

fn trim_to_option(value: String) -> Option<String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}

fn build_oauth_settings_response(settings: &site_settings::Model) -> OAuthSettingsResponse {
    let google_client_id = settings
        .google_client_id
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()));
    let microsoft_client_id = settings
        .microsoft_client_id
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()));

    let google_enabled = google_client_id.is_some()
        || get_env_non_empty("GOOGLE_CLIENT_ID").is_some()
        || get_env_non_empty("GOOGLE_CLIENT_SECRET").is_some();
    let microsoft_enabled = microsoft_client_id.is_some()
        || get_env_non_empty("MICROSOFT_CLIENT_ID").is_some()
        || get_env_non_empty("MICROSOFT_CLIENT_SECRET").is_some();

    OAuthSettingsResponse {
        google_client_id,
        microsoft_client_id,
        google_enabled,
        microsoft_enabled,
        has_google_client_secret: has_non_empty(settings.google_client_secret.as_ref())
            || get_env_non_empty("GOOGLE_CLIENT_SECRET").is_some(),
        has_microsoft_client_secret: has_non_empty(settings.microsoft_client_secret.as_ref())
            || get_env_non_empty("MICROSOFT_CLIENT_SECRET").is_some(),
        has_oauth_state_secret: has_non_empty(settings.oauth_state_secret.as_ref())
            || get_env_non_empty("OAUTH_STATE_SECRET").is_some(),
    }
}

fn build_email_settings_response(settings: &site_settings::Model) -> EmailSettingsResponse {
    let smtp_host = settings
        .smtp_host
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()))
        .or_else(|| get_env_non_empty("SMTP_HOST"));
    let smtp_port = settings.smtp_port.or_else(|| get_env_i32("SMTP_PORT"));
    let smtp_username = settings
        .smtp_username
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()))
        .or_else(|| get_env_non_empty("SMTP_USERNAME"));
    let smtp_from_name = settings
        .smtp_from_name
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()))
        .or_else(|| get_env_non_empty("SMTP_FROM_NAME"));
    let smtp_from_email = settings
        .smtp_from_email
        .as_ref()
        .and_then(|v| trim_to_option(v.clone()))
        .or_else(|| get_env_non_empty("SMTP_FROM_EMAIL"));
    let smtp_use_tls = settings
        .smtp_use_tls
        .or_else(|| get_env_bool("SMTP_USE_TLS"))
        .unwrap_or(true);
    let has_smtp_password = has_non_empty(settings.smtp_password.as_ref())
        || get_env_non_empty("SMTP_PASSWORD").is_some();
    let smtp_enabled = smtp_host.is_some()
        && smtp_port.is_some()
        && smtp_username.is_some()
        && smtp_from_email.is_some()
        && has_smtp_password;

    EmailSettingsResponse {
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_from_name,
        smtp_from_email,
        smtp_use_tls,
        smtp_enabled,
        has_smtp_password,
        email_template_subject: settings
            .email_template_subject
            .as_ref()
            .and_then(|v| trim_to_option(v.clone()))
            .unwrap_or_else(default_email_template_subject),
        email_template_html: settings
            .email_template_html
            .as_ref()
            .and_then(|v| trim_to_option(v.clone()))
            .unwrap_or_else(default_email_template_html),
    }
}

async fn get_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<SiteSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let settings = get_or_create_site_settings(&state).await?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: SiteSettingsResponse::from(settings),
    }))
}

async fn update_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<UpdateSiteSettingsRequest>,
) -> Result<Json<ApiResponse<SiteSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;

    let settings = get_or_create_site_settings(&state).await?;

    let mut active: site_settings::ActiveModel = settings.into();

    if let Some(site_name) = req.site_name {
        active.site_name = Set(site_name);
    }
    if let Some(site_description) = req.site_description {
        active.site_description = Set(site_description);
    }
    if let Some(site_url) = req.site_url {
        active.site_url = Set(site_url);
    }
    if let Some(logo_url) = req.logo_url {
        active.logo_url = Set(Some(logo_url));
    }
    if let Some(favicon_url) = req.favicon_url {
        active.favicon_url = Set(Some(favicon_url));
    }
    if let Some(theme_color) = req.theme_color {
        active.theme_color = Set(theme_color);
    }
    if let Some(footer_text) = req.footer_text {
        active.footer_text = Set(footer_text);
    }
    if let Some(allow_register) = req.allow_register {
        active.allow_register = Set(Some(allow_register));
    }
    if let Some(require_email_verification) = req.require_email_verification {
        active.require_email_verification = Set(Some(require_email_verification));
    }
    if let Some(default_score) = req.default_score {
        active.default_score = Set(Some(default_score));
    }
    if let Some(score_per_storage) = req.score_per_storage {
        active.score_per_storage = Set(Some(score_per_storage));
    }
    if let Some(score_per_closet_item) = req.score_per_closet_item {
        active.score_per_closet_item = Set(Some(score_per_closet_item));
    }
    if let Some(score_per_player) = req.score_per_player {
        active.score_per_player = Set(Some(score_per_player));
    }

    let updated = active.update(&state.db).await.map_err(|e| {
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
        data: SiteSettingsResponse::from(updated),
    }))
}

async fn get_oauth_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<OAuthSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;
    let settings = get_or_create_site_settings(&state).await?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: build_oauth_settings_response(&settings),
    }))
}

async fn update_oauth_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<UpdateOAuthSettingsRequest>,
) -> Result<Json<ApiResponse<OAuthSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;
    let settings = get_or_create_site_settings(&state).await?;

    let mut active: site_settings::ActiveModel = settings.into();

    if let Some(v) = req.google_client_id {
        active.google_client_id = Set(trim_to_option(v));
    }
    if let Some(v) = req.google_client_secret {
        active.google_client_secret = Set(trim_to_option(v));
    }
    if let Some(v) = req.microsoft_client_id {
        active.microsoft_client_id = Set(trim_to_option(v));
    }
    if let Some(v) = req.microsoft_client_secret {
        active.microsoft_client_secret = Set(trim_to_option(v));
    }
    if let Some(v) = req.oauth_state_secret {
        active.oauth_state_secret = Set(trim_to_option(v));
    }

    let updated = active.update(&state.db).await.map_err(|e| {
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
        data: build_oauth_settings_response(&updated),
    }))
}

async fn get_email_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> Result<Json<ApiResponse<EmailSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;
    let settings = get_or_create_site_settings(&state).await?;

    Ok(Json(ApiResponse {
        code: 0,
        message: "success".to_string(),
        data: build_email_settings_response(&settings),
    }))
}

async fn update_email_settings(
    State(state): State<Arc<AppState>>,
    auth_user: AuthUser,
    Json(req): Json<UpdateEmailSettingsRequest>,
) -> Result<Json<ApiResponse<EmailSettingsResponse>>, (StatusCode, Json<ApiResponse<()>>)> {
    require_admin(&state, auth_user.uid).await?;
    let settings = get_or_create_site_settings(&state).await?;

    let mut active: site_settings::ActiveModel = settings.into();

    if let Some(v) = req.smtp_host {
        active.smtp_host = Set(trim_to_option(v));
    }
    if let Some(v) = req.smtp_port {
        active.smtp_port = Set(Some(v));
    }
    if let Some(v) = req.smtp_username {
        active.smtp_username = Set(trim_to_option(v));
    }
    if let Some(v) = req.smtp_password {
        active.smtp_password = Set(trim_to_option(v));
    }
    if let Some(v) = req.smtp_from_name {
        active.smtp_from_name = Set(trim_to_option(v));
    }
    if let Some(v) = req.smtp_from_email {
        active.smtp_from_email = Set(trim_to_option(v));
    }
    if let Some(v) = req.smtp_use_tls {
        active.smtp_use_tls = Set(Some(v));
    }
    if let Some(v) = req.email_template_subject {
        active.email_template_subject = Set(trim_to_option(v));
    }
    if let Some(v) = req.email_template_html {
        active.email_template_html = Set(trim_to_option(v));
    }

    let updated = active.update(&state.db).await.map_err(|e| {
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
        data: build_email_settings_response(&updated),
    }))
}

pub fn router() -> Router<Arc<AppState>> {
    Router::new()
        .route("/users", get(list_users))
        .route("/users/stats", get(get_users_stats))
        .route("/users/{uid}", put(update_user))
        .route("/users/{uid}", delete(delete_user))
        .route("/textures", get(list_textures))
        .route("/textures/{tid}", delete(delete_texture))
        .route("/audit-logs", get(list_audit_logs))
        .route("/settings", get(get_settings))
        .route("/settings", put(update_settings))
        .route("/oauth-settings", get(get_oauth_settings))
        .route("/oauth-settings", put(update_oauth_settings))
        .route("/email-settings", get(get_email_settings))
        .route("/email-settings", put(update_email_settings))
}
