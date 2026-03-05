use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SiteSettings::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SiteSettings::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(SiteSettings::SiteName).string_len(255).not_null())
                    .col(ColumnDef::new(SiteSettings::SiteDescription).string_len(255).not_null())
                    .col(ColumnDef::new(SiteSettings::SiteUrl).string_len(255).not_null())
                    .col(ColumnDef::new(SiteSettings::LogoUrl).string_len(255))
                    .col(ColumnDef::new(SiteSettings::FaviconUrl).string_len(255))
                    .col(ColumnDef::new(SiteSettings::ThemeColor).string_len(50).not_null())
                    .col(ColumnDef::new(SiteSettings::FooterText).string_len(255).not_null())
                    .col(ColumnDef::new(SiteSettings::AllowRegister).boolean().default(true))
                    .col(ColumnDef::new(SiteSettings::RequireEmailVerification).boolean().default(false))
                    .col(ColumnDef::new(SiteSettings::DefaultScore).integer().default(0))
                    .col(ColumnDef::new(SiteSettings::ScorePerStorage).integer().default(0))
                    .col(ColumnDef::new(SiteSettings::ScorePerClosetItem).integer().default(0))
                    .col(ColumnDef::new(SiteSettings::ScorePerPlayer).integer().default(0))
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SiteSettings::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum SiteSettings {
    Table,
    Id,
    SiteName,
    SiteDescription,
    SiteUrl,
    LogoUrl,
    FaviconUrl,
    ThemeColor,
    FooterText,
    AllowRegister,
    RequireEmailVerification,
    DefaultScore,
    ScorePerStorage,
    ScorePerClosetItem,
    ScorePerPlayer,
}
