"use client";

import { ReactNode } from "react";
import QueryProvider from "./QueryProvider";
import { GrpcProvider } from "./GrpcProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <GrpcProvider>{children}</GrpcProvider>
    </QueryProvider>
  );
}
