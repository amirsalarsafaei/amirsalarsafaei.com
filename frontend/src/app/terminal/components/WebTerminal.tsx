"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

// The browser bridge served by the tuissh binary (its WEB_ADDR). The apex
// domain is fronted by Cloudflare, which won't pass the bridge's raw port, so
// in prod we connect to the SSH host directly (ssh.amirsalarsafaei.com), where
// nginx terminates TLS and reverse-proxies wss → the bridge. The page is HTTPS,
// so this must be wss. Override with NEXT_PUBLIC_TUISSH_WS_URL for local dev
// (e.g. ws://localhost:2223/ws).
function wsUrl(cols: number, rows: number): string {
  const base =
    process.env.NEXT_PUBLIC_TUISSH_WS_URL ||
    "wss://ssh.amirsalarsafaei.com/ws";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}cols=${cols}&rows=${rows}`;
}

// Wire protocol (must match internal/web/web.go):
//   send "i" + data    keystrokes
//   send "r" + "c,r"   resize
//   recv binary        raw terminal output
export default function WebTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      allowProposedApi: true,
      fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
      fontSize: 14,
      theme: { background: "#0F172A", foreground: "#E2E8F0" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    let ws: WebSocket | null = null;
    let disposed = false;

    const send = (s: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(s);
    };

    // fit() reads the renderer's measured dimensions; calling it before the
    // container has been laid out throws "Cannot read properties of undefined
    // (reading 'dimensions')". Swallow that — the ResizeObserver retries on the
    // next tick once the element actually has a size.
    const safeFit = (): boolean => {
      try {
        fit.fit();
        return true;
      } catch {
        return false;
      }
    };

    const connect = () => {
      ws = new WebSocket(wsUrl(term.cols, term.rows));
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        send(`r${term.cols},${term.rows}`);
        term.focus();
      };
      ws.onmessage = (e) => term.write(new Uint8Array(e.data as ArrayBuffer));
      ws.onclose = () =>
        term.write("\r\n\x1b[31m• connection closed\x1b[0m\r\n");
    };

    // The container is `position: fixed; inset: 0`, so it resizes with the
    // viewport. ResizeObserver's first callback fires after layout — the right
    // moment to do the initial fit and open the socket with correct cols/rows,
    // sidestepping the synchronous-fit-after-open race. Later callbacks keep
    // the terminal sized to its container and notify the server.
    const ro = new ResizeObserver(() => {
      if (disposed || !safeFit()) return;
      if (!ws) connect();
      else send(`r${term.cols},${term.rows}`);
    });
    ro.observe(containerRef.current);

    const dataSub = term.onData((d) => send(`i${d}`));

    return () => {
      disposed = true;
      ro.disconnect();
      dataSub.dispose();
      ws?.close();
      term.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        padding: 8,
        background: "#0F172A",
      }}
    />
  );
}
