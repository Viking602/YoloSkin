use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_index(
                Index::create()
                    .name("uq_players_player_name")
                    .table(Players::Table)
                    .col(Players::PlayerName)
                    .unique()
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_index(
                Index::drop()
                    .name("uq_players_player_name")
                    .table(Players::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Players {
    Table,
    PlayerName,
}
