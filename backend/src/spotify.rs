use chrono::Utc;
use log::{error, info};
use rspotify::clients::OAuthClient;
use rspotify::model::TimeLimits;
use rspotify::model::TrackId;
use rspotify::prelude::*;
use rspotify::AuthCodeSpotify;
use salar_interface::playground::{
    spotify_server, GetRecentlyPlayedSongRequest, GetRecentlyPlayedSongResponse,
};
use std::sync::Arc;
use time;
use time::OffsetDateTime;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use tonic::Code;
use tonic::Status;

#[derive(Clone)]
pub struct PrivateCreds {
    auth_code: Arc<RwLock<AuthCodeSpotify>>,
}

impl PrivateCreds {
    pub fn new(auth_code: AuthCodeSpotify) -> Self {
        Self {
            auth_code: Arc::new(RwLock::new(auth_code)),
        }
    }
}

#[derive(Clone)]
struct CachedResponse {
    response: TrackInfo,
    cached_at: time::OffsetDateTime,
}

#[derive(Clone)]
struct TrackInfo {
    id: TrackId<'static>,
    artist_name: String,
    track_name: String,
    album_art_url: String,
    is_explicit: bool,
    is_playing: bool,
}

impl TrackInfo {
    fn to_proto(&self) -> GetRecentlyPlayedSongResponse {
        GetRecentlyPlayedSongResponse {
            artist: self.artist_name.clone(),
            track: self.track_name.clone(),
            album_art_url: self.album_art_url.clone(),
            playing: self.is_playing,
        }
    }
}

pub struct SpotifyServicer {
    spotify_client: PrivateCreds,
    cached_response: Arc<RwLock<Option<CachedResponse>>>,
}

impl SpotifyServicer {
    pub fn new(spotify_client: PrivateCreds) -> Self {
        let servicer = Self {
            spotify_client,
            cached_response: Arc::new(RwLock::new(None)),
        };
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
                    }
                    Err(e) => error!("Failed to refresh Spotify token: {}", e),
                }
            }
        });
    }
}

impl SpotifyServicer {
    fn extract_track_info(track: &rspotify::model::FullTrack) -> TrackInfo {
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
            None => "".to_string(),
        };

        let is_explicit = track.explicit;
        let id = track.id.as_ref().unwrap().clone();

        TrackInfo {
            id,
            album_art_url,
            artist_name,
            track_name,
            is_explicit,
            is_playing: false,
        }
    }

    async fn set_cache_response(&self, resp: &TrackInfo) {
        let mut guard = self.cached_response.write().await;
        *guard = Some(CachedResponse {
            response: resp.clone(),
            cached_at: time::OffsetDateTime::now_utc(),
        });
    }

    async fn get_cache_response(&self) -> Option<TrackInfo> {
        let guard = self.cached_response.read().await;
        guard.as_ref().and_then(|cached_value| {
            if cached_value.cached_at < OffsetDateTime::now_utc() - time::Duration::seconds(30) {
                None
            } else {
                Some(cached_value.response.clone())
            }
        })
    }

    async fn get_last_response(&self) -> Option<TrackInfo> {
        let guard = self.cached_response.read().await;
        guard
            .as_ref()
            .and_then(|cached_value| Some(cached_value.response.clone()))
    }
}

#[tonic::async_trait]
impl spotify_server::Spotify for SpotifyServicer {
    async fn get_recently_played_song(
        &self,
        _request: tonic::Request<GetRecentlyPlayedSongRequest>,
    ) -> std::result::Result<tonic::Response<GetRecentlyPlayedSongResponse>, tonic::Status> {
        if let Some(cached_value) = self.get_cache_response().await {
            return Ok(tonic::Response::new(cached_value.to_proto()));
        }

        let client = self.spotify_client.clone();
        let spotify = client.auth_code.read().await;

        let mut track: Option<TrackInfo> = match spotify
            .current_playing(None, Some(vec![&rspotify::model::AdditionalType::Track]))
            .await
        {
            Ok(Some(playing_ctx)) => match playing_ctx.item {
                Some(rspotify::model::PlayableItem::Track(track)) => {
                    let mut track = Self::extract_track_info(&track);
                    track.is_playing = true;
                    Some(track)
                }
                _ => None,
            },
            Ok(None) => {
                info!("no track is being played");
                None
            }
            Err(e) => {
                error!("Failed to fetch current playing track: {}", e);
                None
            }
        };

        if track.as_ref().is_none_or(|t| t.is_explicit) {
            track = match spotify
                .current_user_recently_played(Some(1), Some(TimeLimits::Before(Utc::now())))
                .await
            {
                Ok(played_tracks) => match played_tracks.items.last() {
                    Some(last_played) => Some(Self::extract_track_info(&last_played.track)),
                    _ => None,
                },
                Err(e) => {
                    error!("Failed to fetch played tracks from spotify: {}", e);
                    None
                }
            };
        }

        if track.as_ref().is_none_or(|t| t.is_explicit) {
            track = self.get_last_response().await;
            track = track.and_then(|mut t| {
                t.is_playing = false;
                Some(t)
            });
        }

        match track {
            Some(track) => {
                self.set_cache_response(&track).await;
                Ok(tonic::Response::new(track.to_proto()))
            }
            None => Err(Status::new(Code::NotFound, "no track found")),
        }
    }
}
