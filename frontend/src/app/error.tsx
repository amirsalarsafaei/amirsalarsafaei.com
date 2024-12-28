'use client';

import { say } from "cowsay";
import Navbar from "@/components/Navbar/Navbar";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Navbar />
      <div style={{
        height: '100dvh',
        width: '100dvw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          whiteSpace: "pre",
          overflow: "hidden"
        }}>
          {say({ text: "Either this page is under\nconstruction by cows \nor cows don't know what \nyou are looking for" })}
        </div>
        <button
          onClick={reset}
          className=""
        >
          Try again
        </button>
      </div>
    </>
  );
}
