import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";
import { isSupabaseConfigured, requireSupabaseEnv } from "@/lib/supabase/env";

function isParentPath(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/worksheets") ||
    pathname.startsWith("/settings")
  );
}

function isStudentPath(pathname: string): boolean {
  return pathname.startsWith("/practice");
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasStudent = Boolean(request.cookies.get(STUDENT_COOKIE)?.value);
  const asRole = request.nextUrl.searchParams.get("as");

  if (!isSupabaseConfigured()) {
    if (isParentPath(pathname) || isStudentPath(pathname)) {
      return NextResponse.redirect(new URL("/setup", request.url));
    }
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const { url, key } = requireSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers ?? {}).forEach(([header, value]) => {
          supabaseResponse.headers.set(header, value);
        });
      },
    },
  });

  // Keep this next to createServerClient. Refreshing here is what keeps the session alive.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  // A student cookie wins over a leftover parent session, so a kid cannot open the desk.
  if (hasStudent && signedIn && isParentPath(pathname)) {
    return redirectWithCookies(request, "/practice", supabaseResponse);
  }

  if (!signedIn && isParentPath(pathname)) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (!hasStudent && isStudentPath(pathname)) {
    if (signedIn) return redirectWithCookies(request, "/dashboard", supabaseResponse);
    return redirectWithCookies(request, "/login", supabaseResponse, "?as=student");
  }

  if (hasStudent && !signedIn && isParentPath(pathname)) {
    return redirectWithCookies(request, "/practice", supabaseResponse);
  }

  if (pathname === "/signup") {
    if (hasStudent) return redirectWithCookies(request, "/practice", supabaseResponse);
    if (signedIn) return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (pathname === "/login") {
    if (hasStudent && asRole !== "parent") {
      return redirectWithCookies(request, "/practice", supabaseResponse);
    }
    if (signedIn && !hasStudent && asRole !== "student") {
      return redirectWithCookies(request, "/dashboard", supabaseResponse);
    }
  }

  return supabaseResponse;
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
  search = "",
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}
