"use client";

import dynamic from "next/dynamic";

// xterm.js touches the DOM, so render the terminal only on the client.
const WebTerminal = dynamic(() => import("./components/WebTerminal"), {
  ssr: false,
});

export default function TerminalClient() {
  return <WebTerminal />;
}
