use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SiteSettings::Table)
                    .add_column(ColumnDef::new(SiteSettings::SmtpHost).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::SmtpPort).integer())
                    .add_column(ColumnDef::new(SiteSettings::SmtpUsername).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::SmtpPassword).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::SmtpFromName).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::SmtpFromEmail).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::SmtpUseTls).boolean())
                    .add_column(ColumnDef::new(SiteSettings::EmailTemplateSubject).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::EmailTemplateHtml).text())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SiteSettings::Table)
                    .drop_column(SiteSettings::SmtpHost)
                    .drop_column(SiteSettings::SmtpPort)
                    .drop_column(SiteSettings::SmtpUsername)
                    .drop_column(SiteSettings::SmtpPassword)
                    .drop_column(SiteSettings::SmtpFromName)
                    .drop_column(SiteSettings::SmtpFromEmail)
                    .drop_column(SiteSettings::SmtpUseTls)
                    .drop_column(SiteSettings::EmailTemplateSubject)
                    .drop_column(SiteSettings::EmailTemplateHtml)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum SiteSettings {
    Table,
    SmtpHost,
    SmtpPort,
    SmtpUsername,
    SmtpPassword,
    SmtpFromName,
    SmtpFromEmail,
    SmtpUseTls,
    EmailTemplateSubject,
    EmailTemplateHtml,
}
