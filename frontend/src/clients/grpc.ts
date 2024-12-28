import { SpotifyClientImpl, Spotify, GrpcWebImpl } from '@generated/playground/spotify';
import { BlogsClientImpl, Blogs } from '@generated/blogs/blogs';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';

import { grpc } from '@improbable-eng/grpc-web';

const GRPC_WEB_URL = process.env.NEXT_PUBLIC_GRPC_WEB_URL || 'http://localhost:8000';

// Initialize with null but assert the type
let spotify_client: Spotify = null as unknown as Spotify;
let blogs_client: Blogs = null as unknown as Blogs;

const transport = new GrpcWebImpl(GRPC_WEB_URL, {
  debug: process.env.NODE_ENV === 'development',
  transport: typeof window === 'undefined' ? NodeHttpTransport() : undefined
});


// Function to create gRPC clients
function createGrpcClients() {
  return {
    spotify: new SpotifyClientImpl(transport),
    blogs: new BlogsClientImpl(transport)
  };
}

if (typeof window === 'undefined') {
  const clients = createGrpcClients();
  spotify_client = clients.spotify;
  blogs_client = clients.blogs;
  grpc.setDefaultTransport(NodeHttpTransport())
} else {
  if (!spotify_client || !blogs_client) {
    const clients = createGrpcClients();
    spotify_client = clients.spotify;
    blogs_client = clients.blogs;
  }
}

export { spotify_client, blogs_client };

export function isClient(): boolean {
  return typeof window !== 'undefined';
}

// Helper function to get clients safely
export function getGrpcClients() {
  if (!spotify_client || !blogs_client) {
    const clients = createGrpcClients();
    spotify_client = clients.spotify;
    blogs_client = clients.blogs;
  }
  return { spotify_client, blogs_client };
}

