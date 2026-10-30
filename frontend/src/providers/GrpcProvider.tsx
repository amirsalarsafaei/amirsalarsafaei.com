"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { createGrpcClients, type GrpcClients } from "@/clients/grpc";

interface GrpcContextType extends GrpcClients {
  isReady: boolean;
}

const GrpcContext = createContext<GrpcContextType | undefined>(undefined);

export function GrpcProvider({ children }: { children: ReactNode }) {
  // The client factory is SSR-safe (it only differs in transport/URL), so
  // initialize eagerly. Previously children were gated behind a mount effect,
  // which meant the server HTML for every route was empty — no navbar, no
  // content, no metadata body — until hydration finished.
  const [clients] = useState(() => createGrpcClients());

  return (
    <GrpcContext.Provider value={{ ...clients, isReady: true }}>
      {children}
    </GrpcContext.Provider>
  );
}

export function useGrpc() {
  const context = useContext(GrpcContext);
  if (context === undefined) {
    throw new Error("useGrpc must be used within a GrpcProvider");
  }
  return context;
}
