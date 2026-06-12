use chrono::Utc;
use log::error;
use rspotify::AuthCodeSpotify;
use rspotify::clients::OAuthClient;
use rspotify::model::TimeLimits;
use rspotify::prelude::*;
use futures::Stream;
use salar_interface::playground::{
    GetRecentlyPlayedSongRequest, GetRecentlyPlayedSongResponse, spotify_server,
};
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::{RwLock, watch};
use tokio::time::{Duration, interval, sleep};
use tonic::Code;
use tonic::Status;

/// Server-streaming response type for StreamRecentlyPlayedSong.
type SongStream =
    Pin<Box<dyn Stream<Item = Result<GetRecentlyPlayedSongResponse, Status>> + Send>>;

/// While a track is playing we poll on a short interval so track changes show
/// up quickly. This is the upper bound while playing; we poll even sooner when
/// the current track is about to end.
const POLL_PLAYING: Duration = Duration::from_secs(10);
/// Floor on the interval so we never busy-spin near a track boundary.
const POLL_MIN: Duration = Duration::from_secs(5);
/// Much larger gap when nothing is playing — no point hammering the API while
/// idle, and there's nothing to miss.
const POLL_IDLE: Duration = Duration::from_secs(120);

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

#[derive(Clone, PartialEq)]
struct TrackInfo {
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
    // The latest track, kept current by the background poller. A watch channel
    // both holds the value (so unary requests never touch Spotify) and notifies
    // every stream subscriber when it changes.
    latest: Arc<watch::Sender<Option<TrackInfo>>>,
}

impl SpotifyServicer {
    pub fn new(spotify_client: PrivateCreds) -> Self {
        let (tx, _rx) = watch::channel(None);
        let servicer = Self {
            spotify_client,
            latest: Arc::new(tx),
        };
        servicer.start_token_refresh();
        servicer.start_poller();
        servicer
    }

    // start_poller runs a single background loop that retrieves the now-playing
    // track from Spotify and adapts its cadence to the music: it sleeps until
    // roughly when the current track ends, polls more loosely when the end time
    // is unknown, and backs off while nothing is playing. Spotify's Web API has
    // no push/streaming for playback state, so polling is unavoidable — this
    // just makes it as cheap and timely as the API allows, and does it once for
    // every client instead of per request.
    fn start_poller(&self) {
        let client = self.spotify_client.clone();
        let latest = self.latest.clone();

        tokio::spawn(async move {
            loop {
                let prev = latest.borrow().clone();
                let (track, next) = Self::poll_once(&client, prev).await;
                if let Some(track) = track {
                    // Only push (and wake stream subscribers) when it actually
                    // changed, so streams emit on track changes, not every poll.
                    let changed = latest.borrow().as_ref() != Some(&track);
                    if changed {
                        let _ = latest.send(Some(track));
                    }
                }
                sleep(next).await;
            }
        });
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

        TrackInfo {
            album_art_url,
            artist_name,
            track_name,
            is_explicit,
            is_playing: false,
        }
    }

    // poll_once retrieves the current track from Spotify and decides how long
    // to wait before the next poll. `prev` is the last known track, used as a
    // final fallback (e.g. when the current track is filtered out as explicit).
    async fn poll_once(
        client: &PrivateCreds,
        prev: Option<TrackInfo>,
    ) -> (Option<TrackInfo>, Duration) {
        let spotify = client.auth_code.read().await;

        // 1. What's playing right now (if anything)?
        let mut remaining: Option<Duration> = None;
        let mut track: Option<TrackInfo> = match spotify
            .current_playing(None, Some(vec![&rspotify::model::AdditionalType::Track]))
            .await
        {
            Ok(Some(playing_ctx)) => match playing_ctx.item {
                Some(rspotify::model::PlayableItem::Track(full_track)) => {
                    // How long until this track ends? Used to time the next poll.
                    if let Some(progress) = playing_ctx.progress {
                        let secs = (full_track.duration - progress).num_seconds();
                        if secs > 0 {
                            remaining = Some(Duration::from_secs(secs as u64));
                        }
                    }
                    let mut t = Self::extract_track_info(&full_track);
                    t.is_playing = true;
                    Some(t)
                }
                _ => None,
            },
            Ok(None) => None,
            Err(e) => {
                error!("Failed to fetch current playing track: {}", e);
                None
            }
        };

        // 2. Nothing playing (or filtered as explicit) → most recent track.
        if track.as_ref().is_none_or(|t| t.is_explicit) {
            remaining = None;
            track = match spotify
                .current_user_recently_played(Some(1), Some(TimeLimits::Before(Utc::now())))
                .await
            {
                Ok(played_tracks) => played_tracks
                    .items
                    .last()
                    .map(|last_played| Self::extract_track_info(&last_played.track)),
                Err(e) => {
                    error!("Failed to fetch played tracks from spotify: {}", e);
                    None
                }
            };
        }

        // 3. Still nothing usable → keep showing the previous track.
        if track.as_ref().is_none_or(|t| t.is_explicit) {
            track = prev.map(|mut t| {
                t.is_playing = false;
                t
            });
        }

        drop(spotify);

        // Schedule the next poll: a short interval while a track is playing
        // (even shorter — just after it ends — when we know the remaining
        // time), and a much larger gap while nothing is playing.
        let playing = track.as_ref().is_some_and(|t| t.is_playing);
        let next = if playing {
            match remaining {
                Some(rem) => rem
                    .saturating_add(Duration::from_secs(2))
                    .clamp(POLL_MIN, POLL_PLAYING),
                None => POLL_PLAYING,
            }
        } else {
            POLL_IDLE
        };

        (track, next)
    }
}

#[tonic::async_trait]
impl spotify_server::Spotify for SpotifyServicer {
    async fn get_recently_played_song(
        &self,
        _request: tonic::Request<GetRecentlyPlayedSongRequest>,
    ) -> std::result::Result<tonic::Response<GetRecentlyPlayedSongResponse>, tonic::Status> {
        // The background poller keeps `latest` fresh, so requests are served
        // straight from memory without touching Spotify.
        if let Some(track) = self.latest.borrow().clone() {
            return Ok(tonic::Response::new(track.to_proto()));
        }

        // Cache not warm yet (server just started) — do a single inline fetch
        // and seed the cache so subsequent requests (and stream subscribers)
        // get it.
        let (track, _) = Self::poll_once(&self.spotify_client, None).await;
        match track {
            Some(track) => {
                let _ = self.latest.send(Some(track.clone()));
                Ok(tonic::Response::new(track.to_proto()))
            }
            None => Err(Status::new(Code::NotFound, "no track found")),
        }
    }

    type StreamRecentlyPlayedSongStream = SongStream;

    async fn stream_recently_played_song(
        &self,
        _request: tonic::Request<GetRecentlyPlayedSongRequest>,
    ) -> std::result::Result<tonic::Response<Self::StreamRecentlyPlayedSongStream>, tonic::Status>
    {
        // Subscribe to the shared poller's watch channel. Each subscriber gets
        // the current track immediately (if any) and then every change.
        let rx = self.latest.subscribe();

        let stream = futures::stream::unfold((rx, true), |(mut rx, first)| async move {
            // On the very first poll, emit whatever's already in the channel
            // without waiting for a change.
            if first {
                let cur = rx.borrow_and_update().clone();
                if let Some(track) = cur {
                    return Some((Ok(track.to_proto()), (rx, false)));
                }
            }
            // Then block until the value changes, skipping the initial `None`.
            loop {
                if rx.changed().await.is_err() {
                    return None; // sender dropped — server shutting down
                }
                let cur = rx.borrow_and_update().clone();
                if let Some(track) = cur {
                    return Some((Ok(track.to_proto()), (rx, false)));
                }
            }
        });

        Ok(tonic::Response::new(Box::pin(stream)))
    }
}
