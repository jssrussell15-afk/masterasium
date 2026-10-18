"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main id="content" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 pb-16">
          <section className="calm-state calm-error" role="alert">
            <h1 className="display">Something went quiet</h1>
            <p className="calm-copy">This page did not load. You can try again.</p>
            <button className="btn btn-primary" type="button" onClick={() => retry()}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
