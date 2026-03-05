use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Users::Uid)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Users::Email).string().not_null().unique_key())
                    .col(ColumnDef::new(Users::Nickname).string().not_null())
                    .col(ColumnDef::new(Users::PasswordHash).string().not_null())
                    .col(ColumnDef::new(Users::Avatar).string())
                    .col(ColumnDef::new(Users::Score).integer().default(0))
                    .col(ColumnDef::new(Users::Permission).integer().default(0))
                    .col(ColumnDef::new(Users::Verified).boolean().default(false))
                    .col(ColumnDef::new(Users::RegisterAt).timestamp().not_null())
                    .col(ColumnDef::new(Users::LastSignAt).timestamp())
                    .col(ColumnDef::new(Users::IsAdmin).boolean().default(false))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Users::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
    Email,
    Nickname,
    PasswordHash,
    Avatar,
    Score,
    Permission,
    Verified,
    RegisterAt,
    LastSignAt,
    IsAdmin,
}