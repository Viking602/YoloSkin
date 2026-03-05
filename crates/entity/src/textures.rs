use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "textures")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub tid: i32,
    pub name: String,
    #[sea_orm(column_name = "type")]
    pub texture_type: String,
    #[sea_orm(unique)]
    pub hash: String,
    pub size: i32,
    pub uploader_uid: i32,
    pub public: bool,
    pub upload_at: DateTime,
    pub likes: i32,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::UploaderUid",
        to = "super::users::Column::Uid"
    )]
    Uploader,
    #[sea_orm(has_many = "super::closet_items::Entity")]
    ClosetItems,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Uploader.def()
    }
}

impl Related<super::closet_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ClosetItems.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
