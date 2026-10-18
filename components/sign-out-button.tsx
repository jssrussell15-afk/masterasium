"use client";

import { signOut } from "@/lib/auth/actions";
import { clearBrowserAuthCookies } from "@/lib/auth/browser-cookies";

export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={clearBrowserAuthCookies}>
      <button className="btn btn-quiet" type="submit">
        Sign out
      </button>
    </form>
  );
}
