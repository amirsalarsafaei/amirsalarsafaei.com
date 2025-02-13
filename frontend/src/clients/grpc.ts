import { SpotifyClientImpl, Spotify, GrpcWebImpl } from '@generated/playground/spotify';
import { BlogsClientImpl, Blogs, Tags, TagsClientImpl } from '@generated/blogs/blogs';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import { grpc } from '@improbable-eng/grpc-web';


const GRPC_WEB_URL = process.env.NEXT_PUBLIC_GRPC_WEB_URL || 'http://localhost:8000';

interface GrpcClients {
  spotify_client: Spotify;
  blogs_client: Blogs;
  tags_client: Tags;
}

let clientInstance: GrpcClients | null = null;

export function createGrpcClients(): GrpcClients {
  if (clientInstance) {
    return clientInstance;
  }

  if (!isClient()) {
    grpc.setDefaultTransport(NodeHttpTransport());
  }

  const transport = new GrpcWebImpl(GRPC_WEB_URL, {
    debug: process.env.NODE_ENV === 'development',
    transport: typeof window === 'undefined' ? NodeHttpTransport() : undefined
  });

  clientInstance = {
    tags_client: new TagsClientImpl(transport),
    spotify_client: new SpotifyClientImpl(transport),
    blogs_client: new BlogsClientImpl(transport)
  };


  return clientInstance;
}


export function isClient(): boolean {
  return typeof window !== 'undefined';
}


if (!isClient()) {
  grpc.setDefaultTransport(NodeHttpTransport());
}
