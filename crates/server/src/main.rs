use sea_orm::Database;
use sea_orm_migration::MigratorTrait;
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

mod admin;
mod app_state;
mod auth;
mod closet;
mod config;
mod players;
mod premium;
mod response;
mod routes;
mod session;
mod textures;
mod yggdrasil;

pub use app_state::AppState;
use config::ServerConfig;
pub use response::ApiResponse;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,tower_http=debug")),
        )
        .init();

    let config = ServerConfig::from_env();

    info!("Connecting to database...");
    let db = Database::connect(&config.database_url).await?;

    info!("Running migrations...");
    migration::Migrator::up(&db, None).await?;

    let state = Arc::new(AppState {
        db,
        public_base_url: config.public_base_url,
        data_dir: config.data_dir,
    });

    let app = routes::build_router(state);

    info!("Server listening on {}", config.bind_addr);
    let listener = tokio::net::TcpListener::bind(config.bind_addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
