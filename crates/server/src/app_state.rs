use sea_orm::DatabaseConnection;
use std::path::PathBuf;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub public_base_url: String,
    pub data_dir: PathBuf,
}
