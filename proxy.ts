import { NextResponse, type NextRequest } from "next/server";
import { canonicalRedirectTarget, robotsHeader } from "@/lib/site/hosts";
import { updateSession } from "@/lib/supabase/proxy";

function stampRobots(response: NextResponse, host: string): NextResponse {
  const robots = robotsHeader(host);
  if (robots) response.headers.set("X-Robots-Tag", robots);
  return response;
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto");
  const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const target = canonicalRedirectTarget({ host, proto, path });
  if (target) return stampRobots(NextResponse.redirect(target, 308), host);
  return stampRobots(await updateSession(request), host);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
