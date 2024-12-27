use axum::{
    body::Body,
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use bytes::Bytes;
use futures::{Stream, StreamExt};
use std::path::Path as FilePath;
use tokio::{fs, io::AsyncWriteExt};
use uuid::Uuid;

#[derive(Clone)]
pub struct ImageServer {
    upload_dir: String,
    auth_token: String,
}

impl ImageServer {
    pub fn new(upload_dir: &String, auth_token: &String) -> Self {
        Self {
            upload_dir: upload_dir.clone(),
            auth_token: auth_token.clone(),
        }
    }

    pub fn create_router(&self) -> Router {
        Router::new()
            .route("/upload", post(Self::handle_upload))
            .route("/images/:filename", get(Self::serve_image))
            .layer(DefaultBodyLimit::max(1024 * 1024 * 10)) // 10MB limit
            .with_state(self.clone())
    }

    async fn check_auth(headers: &HeaderMap, auth_token: &str) -> Result<(), StatusCode> {
        match headers.get("Authorization") {
            Some(auth_header) if auth_header == auth_token => Ok(()),
            _ => Err(StatusCode::UNAUTHORIZED),
        }
    }

    async fn handle_upload(
        State(state): State<Self>,
        headers: HeaderMap,
        body: Body,
    ) -> Result<impl IntoResponse, StatusCode> {
        Self::check_auth(&headers, &state.auth_token).await?;

        let file_extension = match headers.get("Content-Type") {
            Some(content_type) if content_type == "image/jpeg" => "jpg",
            Some(content_type) if content_type == "image/png" => "png",
            _ => return Err(StatusCode::BAD_REQUEST),
        };

        if let Some(length) = headers.get(header::CONTENT_LENGTH) {
            let length: u64 = length
                .to_str()
                .map_err(|_| StatusCode::BAD_REQUEST)?
                .parse()
                .map_err(|_| StatusCode::BAD_REQUEST)?;

            if length > 10 * 1024 * 1024 {
                // 10MB limit
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }
        }

        let filename = format!("{}.{}", Uuid::new_v4(), file_extension);
        let filepath = FilePath::new(&state.upload_dir).join(&filename);

        // Create file and stream body chunks directly to it
        let mut file = fs::File::create(&filepath)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let mut stream = body.into_data_stream();
        let mut total_bytes = 0u64;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|_| StatusCode::BAD_REQUEST)?;

            // Check running total for max size
            total_bytes += chunk.len() as u64;
            if total_bytes > 10 * 1024 * 1024 {
                // 10MB limit
                // Clean up the partial file
                let _ = fs::remove_file(&filepath).await;
                return Err(StatusCode::PAYLOAD_TOO_LARGE);
            }

            file.write_all(&chunk)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        file.flush()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        Ok((StatusCode::OK, filename))
    }

    async fn serve_image(
        State(state): State<Self>,
        Path(filename): Path<String>,
    ) -> Result<impl IntoResponse, StatusCode> {
        let filepath = FilePath::new(&state.upload_dir).join(filename);

        let contents = fs::read(&filepath)
            .await
            .map_err(|_| StatusCode::NOT_FOUND)?;

        let content_type = if filepath.extension().and_then(|ext| ext.to_str()) == Some("png") {
            "image/png"
        } else {
            "image/jpeg"
        };

        Ok(([(http::header::CONTENT_TYPE, content_type)], contents))
    }
}
