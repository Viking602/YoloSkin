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
                    .add_column(ColumnDef::new(SiteSettings::GoogleClientId).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::GoogleClientSecret).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::MicrosoftClientId).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::MicrosoftClientSecret).string_len(255))
                    .add_column(ColumnDef::new(SiteSettings::OauthStateSecret).string_len(255))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SiteSettings::Table)
                    .drop_column(SiteSettings::GoogleClientId)
                    .drop_column(SiteSettings::GoogleClientSecret)
                    .drop_column(SiteSettings::MicrosoftClientId)
                    .drop_column(SiteSettings::MicrosoftClientSecret)
                    .drop_column(SiteSettings::OauthStateSecret)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum SiteSettings {
    Table,
    GoogleClientId,
    GoogleClientSecret,
    MicrosoftClientId,
    MicrosoftClientSecret,
    OauthStateSecret,
}
