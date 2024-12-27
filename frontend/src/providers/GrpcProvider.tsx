'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getGrpcClients } from '@/clients/grpc';
import type { Spotify } from '@generated/playground/spotify';
import type { Blogs } from '@generated/blogs/blogs';

interface GrpcContextType {
  spotify_client: Spotify;
  blogs_client: Blogs;
  isReady: boolean;
}

const GrpcContext = createContext<GrpcContextType | undefined>(undefined);

export function GrpcProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [clients, setClients] = useState<Omit<GrpcContextType, 'isReady'> | null>(null);

  useEffect(() => {
    const { spotify_client, blogs_client } = getGrpcClients();
    setClients({ spotify_client, blogs_client });
    setIsReady(true);
  }, []);

  if (!isReady || !clients) {
    return null; // Or a loading component
  }

  return (
    <GrpcContext.Provider value={{ ...clients, isReady }}>
      {children}
    </GrpcContext.Provider>
  );
}

export function useGrpc() {
  const context = useContext(GrpcContext);
  if (context === undefined) {
    throw new Error('useGrpc must be used within a GrpcProvider');
  }
  return context;
}
