use clap::Parser;
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Parser)]
pub struct CliArgs {
    #[clap(short, long, default_value = "config.toml")]
    pub config_path: PathBuf,

    #[clap(short, long, default_value = "spotify.toml")]
    pub spotify_cred_path: PathBuf,
}

#[derive(Deserialize)]
pub struct Config {
    pub database: DatabaseConfig,
    pub server: ServerConfig,
    pub auth_token: String,
    pub image_server: ImageServerConfig,
}

#[derive(Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
}

#[derive(Deserialize)]
pub struct ImageServerConfig {
    pub host: String,
    pub port: u16,
    pub upload_dir: String,
}

#[derive(Deserialize)]
pub struct SpotifyConfig {
    pub client_id: String,
    pub client_secret: String,
    pub refresh_token: String,
    pub redirect_uri: String,
}

pub fn load_config(path: &PathBuf) -> Result<Config, Box<dyn std::error::Error>> {
    let contents = std::fs::read_to_string(path)?;
    let config: Config = toml::from_str(&contents)?;
    Ok(config)
}

pub fn load_spotify_config(path: &PathBuf) -> Result<SpotifyConfig, Box<dyn std::error::Error>> {
    let contents = std::fs::read_to_string(path)?;
    let config: SpotifyConfig = toml::from_str(&contents)?;
    Ok(config)
}

/// Override loaded config values with environment variables when set.
/// Useful for secrets in container deployments.
pub fn override_with_env(config: &mut Config, spotify: &mut SpotifyConfig) {
    if let Ok(url) = std::env::var("DATABASE_URL") {
        config.database.url = url;
    }
    if let Ok(token) = std::env::var("AUTH_TOKEN") {
        config.auth_token = token;
    }
    if let Ok(dir) = std::env::var("IMAGE_UPLOAD_DIR") {
        config.image_server.upload_dir = dir;
    }
    if let Ok(host) = std::env::var("IMAGE_SERVER_HOST") {
        config.image_server.host = host;
    }
    if let Ok(port) = std::env::var("IMAGE_SERVER_PORT") {
        if let Ok(v) = port.parse() {
            config.image_server.port = v;
        }
    }
    if let Ok(id) = std::env::var("SPOTIFY_CLIENT_ID") {
        spotify.client_id = id;
    }
    if let Ok(secret) = std::env::var("SPOTIFY_CLIENT_SECRET") {
        spotify.client_secret = secret;
    }
    if let Ok(refresh) = std::env::var("SPOTIFY_REFRESH_TOKEN") {
        spotify.refresh_token = refresh;
    }
}
