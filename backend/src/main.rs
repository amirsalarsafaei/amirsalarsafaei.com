use blogs::BlogServicer;
use clap::Parser;
use env_logger;
use rspotify::{AuthCodeSpotify, Credentials, OAuth};
use salar_interface;
use spotify::{PrivateCreds, SpotifyServicer};
use tonic_web::{CorsGrpcWeb, GrpcWebLayer, GrpcWebService};
use std::{process, time::Duration};
use tonic::transport::Server;
use tower_http::cors::{CorsLayer, AllowOrigin};
use http::HeaderName;
use tower_layer::{self, Layer};

const DEFAULT_EXPOSED_HEADERS: [HeaderName; 4] = [
    HeaderName::from_static("grpc-status"),
    HeaderName::from_static("grpc-message"),
    HeaderName::from_static("grpc-status-details-bin"),
    HeaderName::from_static("x-grpc-web"),
];
const DEFAULT_ALLOW_HEADERS: [&str; 6] = [
    "x-grpc-web",
    "content-type",
    "x-user-agent",
    "grpc-timeout",
    "accept",
    "authorization",
];

const DEFAULT_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);

mod blogs;
mod config;
mod cornucopia;
mod db;
mod spotify;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    env_logger::init();

    let args = config::CliArgs::parse();
    let config = match config::load_config(&args.config_path) {
        Ok(config) => config,
        Err(err) => {
            eprintln!("Failed to load config: {}", err);
            process::exit(1);
        }
    };

    let spotify_config = match config::load_spotify_config(&args.spotify_cred_path) {
        Ok(config) => config,
        Err(err) => {
            eprintln!("Failed to load spotify config: {}", err);
            process::exit(1);
        }
    };

    let pool = match db::create_pool(&config.database).await {
        Ok(pool) => pool,
        Err(err) => {
            eprintln!("Failed to create database connection pool: {}", err);
            process::exit(1);
        }
    };

    let creds = Credentials::new(&spotify_config.client_id, &spotify_config.client_secret);

    let oauth = OAuth {
        redirect_uri: spotify_config.redirect_uri,
        ..Default::default()
    };

    let spotify = AuthCodeSpotify::new(creds, oauth);

    let mut token = rspotify::Token::default();
    token.refresh_token = Some(spotify_config.refresh_token.clone());
    *spotify.token.lock().await.unwrap() = Some(token);

    let addr = format!("{}:{}", config.server.host, config.server.port).parse()?;

    println!("Starting server on {}", addr);

    let reflection_service = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(salar_interface::playground::FILE_DESCRIPTOR_SET)
        .register_encoded_file_descriptor_set(salar_interface::blogs::FILE_DESCRIPTOR_SET)
        .build_v1alpha()
        .unwrap();

    let spotify_servier = salar_interface::playground::spotify_server::SpotifyServer::new(
        SpotifyServicer::new(PrivateCreds::new(spotify, &args.spotify_cred_path)),
    );

    let blogs_servicer = salar_interface::blogs::blogs_server::BlogsServer::new(BlogServicer::new(
        pool.clone(),
        config.auth_token.clone(),
    ));

    let cors_layer = CorsLayer::new()
        .allow_origin(AllowOrigin::mirror_request())
        .allow_credentials(true)
        .max_age(DEFAULT_MAX_AGE)
        .expose_headers(DEFAULT_EXPOSED_HEADERS.iter().cloned().collect::<Vec<_>>())
        .allow_headers(
            DEFAULT_ALLOW_HEADERS
                .iter()
                .cloned()
                .map(HeaderName::from_static)
                .collect::<Vec<HeaderName>>(),
        );

    Server::builder()
        .accept_http1(true)
        .layer(cors_layer)
        .layer(GrpcWebLayer::new())
        .add_service(spotify_servier)
        .add_service(blogs_servicer)
        .add_service(reflection_service)
        .serve(addr)
        .await?;

    Ok(())
}
