use log::{error, info};
use rspotify::clients::OAuthClient;
use rspotify::model::PlayableItem::Track;
use rspotify::model::TimeLimits;
use chrono::Utc;
use rspotify::prelude::*;
use rspotify::AuthCodeSpotify;
use salar_interface::playground::{GetRecentlyPlayedSongRequest, GetRecentlyPlayedSongResponse, spotify_server};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use toml_edit::DocumentMut;



#[derive(Clone)]
pub struct PrivateCreds {
    auth_code: Arc<RwLock<AuthCodeSpotify>>,
    spotify_cred_path: PathBuf,
}

impl PrivateCreds {
    pub fn new(auth_code: AuthCodeSpotify, spotify_cred_path: &PathBuf) -> Self {
        Self {
            auth_code: Arc::new(RwLock::new(auth_code)),
            spotify_cred_path: spotify_cred_path.clone(),
        }
    }

    async fn write_tokens_to_file(&self) -> Result<(), Box<dyn std::error::Error>> {
        let guard = self.auth_code.read().await;
        let token_lock = guard.get_token();
        let token_gaurd = token_lock.lock().await.unwrap();
        let token = token_gaurd.as_ref().unwrap();

        let content = fs::read_to_string(&self.spotify_cred_path)?;
        let mut doc = content.parse::<DocumentMut>()?;

        let table = doc.as_table_mut();
        if let Some(refresh_token) = &token.refresh_token {
            table["refresh_token"] = toml_edit::value(refresh_token);
        }

        fs::write(&self.spotify_cred_path, doc.to_string())?;
        Ok(())
    } }

pub struct SpotifyServicer {
    spotify_client: PrivateCreds,
}

impl SpotifyServicer {
    pub fn new(spotify_client: PrivateCreds) -> Self {
        let servicer = Self { spotify_client };
        servicer.start_token_refresh();
        servicer
    }

    fn start_token_refresh(&self) {
        let spotify_client = self.spotify_client.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(3000)); // 50 minutes

            loop {
                interval.tick().await;

                let client = spotify_client.clone();
                let guard = client.auth_code.write().await;
                match (*guard).refresh_token().await {
                    Ok(_) => {
                        drop(guard); 
                        match client.write_tokens_to_file().await {
                            Ok(_) => info!("Successfully refreshed and saved Spotify token"),
                            Err(e) => error!("Failed to save refreshed token to file: {}", e),
                        }
                    }
                    Err(e) => error!("Failed to refresh Spotify token: {}", e),
                }
            }
        });
    }
}

impl SpotifyServicer {
    fn extract_track_info(track: &rspotify::model::FullTrack) -> (String, String, String) {
        let track_name = track.name.clone();
        let artist_name = match track.artists.len() {
            0 => "Unknown Artist".to_string(),
            _ => track
                .artists
                .iter()
                .map(|artist| artist.name.clone())
                .collect::<Vec<String>>()
                .join(", "),
        };

        let album_art_url = match track.album.images.first() {
            Some(img) => img.url.clone(),
            None => "".to_string()
        };
        
        (track_name, artist_name, album_art_url)
    }
}

#[tonic::async_trait]
impl spotify_server::Spotify for SpotifyServicer {
    async fn get_recently_played_song(
        &self,
        _request: tonic::Request<GetRecentlyPlayedSongRequest>,
    ) -> std::result::Result<
        tonic::Response<GetRecentlyPlayedSongResponse>,
        tonic::Status,
    > {
        let client = self.spotify_client.clone();
        let spotify = client.auth_code.read().await;

        match spotify.current_playing(None, Some(vec![&rspotify::model::AdditionalType::Track])).await {
            Ok(Some(playing_ctx)) => {
                if let Some(item) = playing_ctx.item {
                    if let Track(track) = item {
                        let (track_name, artist_name, album_art_url) = Self::extract_track_info(&track);
                        let response = GetRecentlyPlayedSongResponse {
                            track: track_name,
                            artist: artist_name,
                            playing: true,
                            album_art_url,
                        };
                        return Ok(tonic::Response::new(response));
                    }
                }
            }
            Ok(None) => {
                info!("no track is being played")
            }
            Err(e) => {
                error!("Failed to fetch current playing track: {}", e);
            }
        }

        match spotify.current_user_recently_played(Some(1), Some(TimeLimits::Before(Utc::now()))).await {
            Ok(played_tracks) => {
                if let Some(last_played) = played_tracks.items.last() {
                    let (track_name, artist_name, album_art_url) = Self::extract_track_info(&last_played.track);
                    let response = GetRecentlyPlayedSongResponse {
                        track: track_name,
                        artist: artist_name,
                        playing: false,
                        album_art_url,
                    };
                    Ok(tonic::Response::new(response))
                } else {
                    Err(tonic::Status::not_found("No recently played tracks found"))
                }
            }
            Err(e) => {
                error!("Failed to fetch played tracks from spotify: {}", e);
                Err(tonic::Status::internal(
                    "Failed to fetch recently played tracks",
                ))
            }
        }
    }
}
