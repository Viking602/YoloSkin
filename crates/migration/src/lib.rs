use sea_orm_migration::prelude::*;

mod m20250101_000001_create_users_table;
mod m20250101_000002_create_players_table;
mod m20250101_000003_create_textures_table;
mod m20250101_000004_create_closet_items_table;
mod m20250101_000005_create_premium_bindings_table;
mod m20250101_000006_create_audit_logs_table;
mod m20250101_000007_create_site_settings_table;
mod m20250101_000008_create_yggdrasil_tables;
mod m20260209_000009_add_unique_player_name_index;
mod m20260209_000010_add_oauth_columns_to_site_settings;
mod m20260209_000011_add_email_columns_to_site_settings;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20250101_000001_create_users_table::Migration),
            Box::new(m20250101_000002_create_players_table::Migration),
            Box::new(m20250101_000003_create_textures_table::Migration),
            Box::new(m20250101_000004_create_closet_items_table::Migration),
            Box::new(m20250101_000005_create_premium_bindings_table::Migration),
            Box::new(m20250101_000006_create_audit_logs_table::Migration),
            Box::new(m20250101_000007_create_site_settings_table::Migration),
            Box::new(m20250101_000008_create_yggdrasil_tables::Migration),
            Box::new(m20260209_000009_add_unique_player_name_index::Migration),
            Box::new(m20260209_000010_add_oauth_columns_to_site_settings::Migration),
            Box::new(m20260209_000011_add_email_columns_to_site_settings::Migration),
        ]
    }
}
