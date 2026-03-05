use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Players::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Players::Pid)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Players::Uid).integer().not_null())
                    .col(ColumnDef::new(Players::PlayerName).string().not_null())
                    .col(ColumnDef::new(Players::Uuid).string().not_null().unique_key())
                    .col(ColumnDef::new(Players::TidSkin).integer())
                    .col(ColumnDef::new(Players::TidCape).integer())
                    .col(ColumnDef::new(Players::CreatedAt).timestamp().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-players-uid")
                            .from(Players::Table, Players::Uid)
                            .to(Alias::new("users"), Alias::new("uid"))
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Players::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Players {
    Table,
    Pid,
    Uid,
    PlayerName,
    Uuid,
    TidSkin,
    TidCape,
    CreatedAt,
}