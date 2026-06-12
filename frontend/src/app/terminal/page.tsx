import nextDynamic from "next/dynamic";

// xterm.js touches the DOM, so render the terminal only on the client.
const WebTerminal = nextDynamic(() => import("./components/WebTerminal"), {
  ssr: false,
});

export const metadata = {
  title: "terminal · amirsalar",
  description:
    "The amirsalarsafaei.com terminal UI, in your browser — the very same Bubble Tea app served over SSH.",
};

export default function TerminalPage() {
  return <WebTerminal />;
}
