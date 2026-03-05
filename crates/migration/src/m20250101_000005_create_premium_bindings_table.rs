use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(PremiumBindings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(PremiumBindings::Uid)
                            .integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(PremiumBindings::Uuid).string().not_null())
                    .col(ColumnDef::new(PremiumBindings::Username).string().not_null())
                    .col(ColumnDef::new(PremiumBindings::BoundAt).timestamp().not_null())
                    .col(ColumnDef::new(PremiumBindings::TokenHash).string())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_premium_bindings_uid")
                            .from(PremiumBindings::Table, PremiumBindings::Uid)
                            .to(Users::Table, Users::Uid)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(PremiumBindings::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum PremiumBindings {
    Table,
    Uid,
    Uuid,
    Username,
    BoundAt,
    TokenHash,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
}
