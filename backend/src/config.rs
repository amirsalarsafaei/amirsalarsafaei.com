use serde::Deserialize;
use std::path::PathBuf;
use clap::Parser;

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
