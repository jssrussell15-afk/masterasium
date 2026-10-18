import Link from "next/link";
import { CalmState } from "@/components/calm-state";
import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";

export default async function NotFound() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <CalmState
        kind="error"
        title="That page isn't here"
        action={
          <Link href="/" className="btn btn-primary">
            Back home
          </Link>
        }
      >
        The link may be old. Let&apos;s go back home.
      </CalmState>
    </Shell>
  );
}
