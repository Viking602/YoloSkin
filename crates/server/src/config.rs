use std::{env, net::SocketAddr, path::PathBuf};

pub struct ServerConfig {
    pub database_url: String,
    pub bind_addr: SocketAddr,
    pub public_base_url: String,
    pub data_dir: PathBuf,
}

impl ServerConfig {
    pub fn from_env() -> Self {
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let bind_addr: SocketAddr = env::var("BIND_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:3000".to_string())
            .parse()
            .expect("BIND_ADDR must be a valid socket address");
        let public_base_url =
            env::var("PUBLIC_BASE_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
        let data_dir = PathBuf::from(env::var("DATA_DIR").unwrap_or_else(|_| "./data".to_string()));

        Self {
            database_url,
            bind_addr,
            public_base_url,
            data_dir,
        }
    }
}
