'use client';

import { say } from "cowsay";

export default function NotFound() {
  return (
    <>
      <div style={{
        height: '100dvh',
        width: '100dvw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <div style={{
          whiteSpace: "pre",
          overflow: "hidden",
          fontFamily: "monospace"
        }}>
          {say({ text: "404: The cows couldn't\nfind this page!" })}
        </div>
      </div>
    </>
  );
}
