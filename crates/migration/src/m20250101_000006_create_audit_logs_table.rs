use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(AuditLogs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AuditLogs::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(AuditLogs::UserId).integer())
                    .col(ColumnDef::new(AuditLogs::UserEmail).string_len(255).not_null())
                    .col(ColumnDef::new(AuditLogs::Action).string_len(255).not_null())
                    .col(ColumnDef::new(AuditLogs::Ip).string_len(255).not_null())
                    .col(ColumnDef::new(AuditLogs::UserAgent).string_len(255).not_null())
                    .col(ColumnDef::new(AuditLogs::CreatedAt).timestamp().not_null())
                    .col(ColumnDef::new(AuditLogs::Details).json_binary())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_audit_logs_user_id")
                            .from(AuditLogs::Table, AuditLogs::UserId)
                            .to(Users::Table, Users::Uid)
                            .on_delete(ForeignKeyAction::SetNull)
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(AuditLogs::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum AuditLogs {
    Table,
    Id,
    UserId,
    UserEmail,
    Action,
    Ip,
    UserAgent,
    CreatedAt,
    Details,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
}
