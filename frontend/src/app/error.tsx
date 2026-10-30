"use client";

import { useEffect } from "react";
import StatusScreen from "@/components/StatusScreen/StatusScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      title="internal_error"
      message="Something broke on the way to this page."
      detail={
        error.digest ? `error digest: ${error.digest}` : "please try again"
      }
      actionLabel="Try again"
      onAction={reset}
    />
  );
}
