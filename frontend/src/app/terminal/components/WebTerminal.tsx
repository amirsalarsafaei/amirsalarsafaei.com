"use client";

import { useEffect, useRef, useState } from "react";
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
    process.env.NEXT_PUBLIC_TUISSH_WS_URL || "wss://ssh.amirsalarsafaei.com/ws";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}cols=${cols}&rows=${rows}`;
}

type ConnectionStatus = "connecting" | "open" | "closed";

const statusCopy: Record<ConnectionStatus, string> = {
  connecting: "connecting",
  open: "connected",
  closed: "connection closed · click to retry",
};

const statusColor: Record<ConnectionStatus, string> = {
  connecting: "#ffcc66",
  open: "#5ef2c2",
  closed: "#ff7675",
};

// Wire protocol (must match internal/web/web.go):
//   send "i" + data    keystrokes
//   send "r" + "c,r"   resize
//   recv binary        raw terminal output
export default function WebTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      allowProposedApi: true,
      fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
      fontSize: 14,
      lineHeight: 1.25,
      scrollback: 5000,
      theme: {
        background: "#080b0a",
        foreground: "#c7d0cd",
        cursor: "#43d9ad",
        cursorAccent: "#080b0a",
        selectionBackground: "rgba(67, 217, 173, 0.25)",
        black: "#0d1311",
        red: "#ff7675",
        green: "#43d9ad",
        yellow: "#ffcc66",
        blue: "#7f5af0",
        magenta: "#b48bff",
        cyan: "#5ef2c2",
        white: "#d6deeb",
        brightBlack: "#607b96",
        brightRed: "#ff8a80",
        brightGreen: "#5ef2c2",
        brightYellow: "#ffe08a",
        brightBlue: "#9d7bff",
        brightMagenta: "#c9a6ff",
        brightCyan: "#8fffd9",
        brightWhite: "#ffffff",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);

    let ws: WebSocket | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
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
      setStatus("connecting");
      ws = new WebSocket(wsUrl(term.cols, term.rows));
      ws.binaryType = "arraybuffer";

      // Don't leave the status pill on "connecting" forever when the host is
      // unreachable (DNS stall, blocked websocket, offline).
      connectTimer = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) setStatus("closed");
      }, 8000);

      ws.onopen = () => {
        if (connectTimer) clearTimeout(connectTimer);
        setStatus("open");
        send(`r${term.cols},${term.rows}`);
        term.focus();
      };
      ws.onmessage = (e) => term.write(new Uint8Array(e.data as ArrayBuffer));
      ws.onclose = () => {
        if (connectTimer) clearTimeout(connectTimer);
        setStatus("closed");
        term.write("\r\n\x1b[31m• connection closed\x1b[0m\r\n");
      };
      ws.onerror = () => {
        if (connectTimer) clearTimeout(connectTimer);
        setStatus("closed");
      };
    };

    // The container is `position: fixed`, so it resizes with the viewport.
    // ResizeObserver's first callback fires after layout — the right moment to
    // do the initial fit and open the socket with correct cols/rows, sidestepping
    // the synchronous-fit-after-open race. Later callbacks keep the terminal
    // sized to its container and notify the server.
    const ro = new ResizeObserver(() => {
      if (disposed || !safeFit()) return;
      if (!ws) connect();
      else send(`r${term.cols},${term.rows}`);
    });
    ro.observe(containerRef.current);

    const dataSub = term.onData((d) => send(`i${d}`));

    return () => {
      disposed = true;
      if (connectTimer) clearTimeout(connectTimer);
      ro.disconnect();
      dataSub.dispose();
      ws?.close();
      term.dispose();
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: "var(--navbar-height, 4rem)",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 8,
          background: "#080b0a",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "calc(var(--navbar-height, 4rem) + 12px)",
          right: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(67, 217, 173, 0.18)",
          background: "rgba(7, 16, 24, 0.85)",
          backdropFilter: "blur(8px)",
          color: statusColor[status],
          fontFamily: "monospace",
          fontSize: 11,
          letterSpacing: "0.03em",
          pointerEvents: status === "closed" ? "auto" : "none",
          cursor: status === "closed" ? "pointer" : "default",
          userSelect: "none",
        }}
        role="status"
        aria-live="polite"
        title={status === "closed" ? "Reconnect" : undefined}
        onClick={() => {
          if (status === "closed") window.location.reload();
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: statusColor[status],
            boxShadow: `0 0 8px ${statusColor[status]}`,
          }}
        />
        {statusCopy[status]}
      </div>
    </>
  );
}
