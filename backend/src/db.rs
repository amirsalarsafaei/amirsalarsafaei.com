use deadpool_postgres::{Config, ManagerConfig, RecyclingMethod, Runtime, Pool, CreatePoolError};
use tokio_postgres::NoTls;

use crate::config::DatabaseConfig;


pub async fn create_pool(config: &DatabaseConfig) -> Result<Pool, CreatePoolError> {
    let mut cfg = Config::new();
    cfg.url = Some(config.url.clone());
    cfg.manager = Some(ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    });

    return cfg.create_pool(Some(Runtime::Tokio1), NoTls);
}

