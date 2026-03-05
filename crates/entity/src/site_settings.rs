use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "site_settings")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub site_name: String,
    pub site_description: String,
    pub site_url: String,
    pub logo_url: Option<String>,
    pub favicon_url: Option<String>,
    pub theme_color: String,
    pub footer_text: String,
    pub allow_register: Option<bool>,
    pub require_email_verification: Option<bool>,
    pub default_score: Option<i32>,
    pub score_per_storage: Option<i32>,
    pub score_per_closet_item: Option<i32>,
    pub score_per_player: Option<i32>,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub microsoft_client_id: Option<String>,
    pub microsoft_client_secret: Option<String>,
    pub oauth_state_secret: Option<String>,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<i32>,
    pub smtp_username: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from_name: Option<String>,
    pub smtp_from_email: Option<String>,
    pub smtp_use_tls: Option<bool>,
    pub email_template_subject: Option<String>,
    pub email_template_html: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
