import { SpotifyClientImpl, Spotify, GrpcWebImpl } from '@generated/playground/spotify';
import { BlogsClientImpl, Blogs, Tags, TagsClientImpl } from '@generated/blogs/blogs';
import { grpc } from '@improbable-eng/grpc-web';

// Dynamically import NodeHttpTransport only on server-side
const getNodeHttpTransport = () => {
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { NodeHttpTransport } = require('@improbable-eng/grpc-web-node-http-transport');
      return NodeHttpTransport;
    } catch (error) {
      console.warn('NodeHttpTransport not available:', error);
      return null;
    }
  }
  return null;
};


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

  const NodeHttpTransport = getNodeHttpTransport();

  if (!isClient() && NodeHttpTransport) {
    grpc.setDefaultTransport(NodeHttpTransport());
  }

  const transport = new GrpcWebImpl(GRPC_WEB_URL, {
    debug: process.env.NODE_ENV === 'development',
    transport: typeof window === 'undefined' && NodeHttpTransport ? NodeHttpTransport() : undefined
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


// Default transport is set dynamically in createGrpcClients()
