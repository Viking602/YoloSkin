use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub uid: i32,
    #[sea_orm(unique)]
    pub email: String,
    pub nickname: String,
    pub password_hash: String,
    pub avatar: Option<String>,
    pub score: Option<i32>,
    pub permission: Option<i32>,
    pub verified: Option<bool>,
    pub register_at: DateTime,
    pub last_sign_at: Option<DateTime>,
    pub is_admin: Option<bool>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::players::Entity")]
    Players,
    #[sea_orm(has_many = "super::textures::Entity")]
    Textures,
    #[sea_orm(has_many = "super::closet_items::Entity")]
    ClosetItems,
    #[sea_orm(has_one = "super::premium_bindings::Entity")]
    PremiumBinding,
    #[sea_orm(has_many = "super::audit_logs::Entity")]
    AuditLogs,
    #[sea_orm(has_many = "super::yggdrasil_tokens::Entity")]
    YggdrasilTokens,
}

impl Related<super::players::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Players.def()
    }
}

impl Related<super::textures::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Textures.def()
    }
}

impl Related<super::closet_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ClosetItems.def()
    }
}

impl Related<super::premium_bindings::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::PremiumBinding.def()
    }
}

impl Related<super::audit_logs::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::AuditLogs.def()
    }
}

impl Related<super::yggdrasil_tokens::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::YggdrasilTokens.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
