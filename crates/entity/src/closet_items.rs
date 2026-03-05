use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "closet_items")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub uid: i32,
    #[sea_orm(primary_key, auto_increment = false)]
    pub tid: i32,
    pub added_at: DateTime,
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
        from = "Column::Tid",
        to = "super::textures::Column::Tid"
    )]
    Texture,
}

impl Related<super::users::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::textures::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Texture.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
