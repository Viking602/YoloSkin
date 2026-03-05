use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Textures::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Textures::Tid)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Textures::Name).string_len(255).not_null())
                    .col(ColumnDef::new(Textures::Type).string_len(50).not_null())
                    .col(
                        ColumnDef::new(Textures::Hash)
                            .string_len(255)
                            .not_null()
                            .unique_key(),
                    )
                    .col(ColumnDef::new(Textures::Size).integer().not_null())
                    .col(ColumnDef::new(Textures::UploaderUid).integer().not_null())
                    .col(
                        ColumnDef::new(Textures::Public)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Textures::UploadAt).timestamp().not_null())
                    .col(
                        ColumnDef::new(Textures::Likes)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_textures_uploader_uid")
                            .from(Textures::Table, Textures::UploaderUid)
                            .to(Users::Table, Users::Uid)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Textures::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Textures {
    Table,
    Tid,
    Name,
    Type,
    Hash,
    Size,
    UploaderUid,
    Public,
    UploadAt,
    Likes,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Uid,
}
