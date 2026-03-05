use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(YggdrasilTokens::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(YggdrasilTokens::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(YggdrasilTokens::AccessTokenHash)
                            .string_len(255)
                            .not_null()
                            .unique_key(),
                    )
                    .col(
                        ColumnDef::new(YggdrasilTokens::ClientTokenHash)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(ColumnDef::new(YggdrasilTokens::Uid).integer().not_null())
                    .col(ColumnDef::new(YggdrasilTokens::ExpiresAt).timestamp().not_null())
                    .col(ColumnDef::new(YggdrasilTokens::LastUsedAt).timestamp().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_yggdrasil_tokens_uid")
                            .from(YggdrasilTokens::Table, YggdrasilTokens::Uid)
                            .to(Users::Table, Users::Uid)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(JoinSessions::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(JoinSessions::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(JoinSessions::ProfileUuid)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(JoinSessions::ServerId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(ColumnDef::new(JoinSessions::Ip).string_len(255))
                    .col(ColumnDef::new(JoinSessions::CreatedAt).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(YggdrasilKeys::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(YggdrasilKeys::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(YggdrasilKeys::KeyId)
                            .string_len(255)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(YggdrasilKeys::PublicKeyPem).text().not_null())
                    .col(
                        ColumnDef::new(YggdrasilKeys::PrivateKeyPemEncrypted)
                            .text()
                            .not_null(),
                    )
                    .col(ColumnDef::new(YggdrasilKeys::CreatedAt).timestamp().not_null())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(YggdrasilKeys::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(JoinSessions::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(YggdrasilTokens::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum YggdrasilTokens {
    Table,
    Id,
    AccessTokenHash,
    ClientTokenHash,
    Uid,
    ExpiresAt,
    LastUsedAt,
}

#[derive(DeriveIden)]
enum JoinSessions {
    Table,
    Id,
    ProfileUuid,
    ServerId,
    Ip,
    CreatedAt,
}

#[derive(DeriveIden)]
enum YggdrasilKeys {
    Table,
    Id,
    KeyId,
    PublicKeyPem,
    PrivateKeyPemEncrypted,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
}
