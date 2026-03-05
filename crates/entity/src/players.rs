use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "players")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub pid: i32,
    pub uid: i32,
    pub player_name: String,
    #[sea_orm(unique)]
    pub uuid: String,
    pub tid_skin: Option<i32>,
    pub tid_cape: Option<i32>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::Uid",
        to = "super::users::Column::Uid"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::textures::Entity",
        from = "Column::TidSkin",
        to = "super::textures::Column::Tid"
    )]
    SkinTexture,
    #[sea_orm(
        belongs_to = "super::textures::Entity",
        from = "Column::TidCape",
        to = "super::textures::Column::Tid"
    )]
    CapeTexture,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
