"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CalmState } from "@/components/calm-state";
import { Shell } from "@/components/site-header";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Shell narrow>
      <CalmState
        kind="error"
        title="Something went quiet"
        action={
          <div className="cta-row">
            <button className="btn btn-primary" type="button" onClick={() => retry()}>
              Try again
            </button>
            <Link href="/" className="btn btn-quiet">
              Back home
            </Link>
          </div>
        }
      >
        This page did not load. You can try again.
      </CalmState>
    </Shell>
  );
}
