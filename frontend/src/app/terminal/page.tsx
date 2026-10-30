import TerminalClient from "./TerminalClient";

export const metadata = {
  title: "terminal · amirsalar",
  description:
    "The amirsalarsafaei.com terminal UI, in your browser — the very same Bubble Tea app served over SSH.",
};

export default function TerminalPage() {
  return <TerminalClient />;
}
