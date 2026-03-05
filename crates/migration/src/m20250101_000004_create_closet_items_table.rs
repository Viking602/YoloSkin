use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(ClosetItems::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ClosetItems::Uid)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ClosetItems::Tid)
                            .integer()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ClosetItems::AddedAt).timestamp().not_null())
                    .primary_key(
                        Index::create()
                            .name("pk_closet_items")
                            .col(ClosetItems::Uid)
                            .col(ClosetItems::Tid)
                            .primary(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_closet_items_user")
                            .from(ClosetItems::Table, ClosetItems::Uid)
                            .to(Users::Table, Users::Uid)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_closet_items_texture")
                            .from(ClosetItems::Table, ClosetItems::Tid)
                            .to(Textures::Table, Textures::Tid)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ClosetItems::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum ClosetItems {
    Table,
    Uid,
    Tid,
    AddedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
}

#[derive(DeriveIden)]
enum Textures {
    Table,
    Tid,
}
