import { SpotifyClientImpl, Spotify, GrpcWebImpl } from '@generated/playground/spotify';
import { BlogsClientImpl, Blogs } from '@generated/blogs/blogs';

const GRPC_WEB_URL = import.meta.env.VITE_GRPC_WEB_URL || 'http://localhost:8000';

export const spotify_client: Spotify = new SpotifyClientImpl(new GrpcWebImpl(GRPC_WEB_URL, {}));

export const blogs_client: Blogs = new BlogsClientImpl(new GrpcWebImpl(GRPC_WEB_URL, {}));

