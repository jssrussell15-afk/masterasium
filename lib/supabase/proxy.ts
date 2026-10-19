import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { currentStudentId } from "@/lib/auth/student-client";
import { homeFor, permissionForPath, roleFromSession, type Role } from "@/lib/auth/roles";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";
import { isSupabaseConfigured, requireSupabaseEnv } from "@/lib/supabase/env";

function isParentPath(pathname: string): boolean {
  const permission = permissionForPath(pathname);
  return permission != null && permission !== "practice";
}

function isStudentPath(pathname: string): boolean {
  return permissionForPath(pathname) === "practice";
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const studentToken = request.cookies.get(STUDENT_COOKIE)?.value?.trim() ?? "";
  const hasStudent = Boolean(studentToken);
  const asRole = request.nextUrl.searchParams.get("as");

  if (!isSupabaseConfigured()) {
    if (permissionForPath(pathname)) {
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

  const role = roleFromSession({ hasStudent, hasParent: signedIn });

  // A student cookie wins over a leftover parent session, so a kid cannot open the desk.
  if (role === "student" && isParentPath(pathname)) {
    return redirectWithCookies(request, homeFor("student"), supabaseResponse);
  }

  if (!signedIn && isParentPath(pathname)) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (role !== "student" && isStudentPath(pathname)) {
    if (role === "parent") return redirectWithCookies(request, homeFor("parent"), supabaseResponse);
    return redirectWithCookies(request, "/login", supabaseResponse, "?as=student");
  }

  // Login and signup are the only routes that bounce a student cookie away.
  // Confirm the token here. Other routes keep the cookie check so this call
  // is not added to every request. The header cannot reuse this result:
  // proxy runs in its own invocation, before the page render.
  const authRole =
    pathname === "/login" || pathname === "/signup"
      ? await roleForAuthPage(studentToken, signedIn)
      : role;

  if (pathname === "/signup") {
    if (authRole === "student") return redirectWithCookies(request, homeFor("student"), supabaseResponse);
    if (authRole === "parent") return redirectWithCookies(request, homeFor("parent"), supabaseResponse);
  }

  if (pathname === "/login") {
    if (authRole === "student" && asRole !== "parent") {
      return redirectWithCookies(request, homeFor("student"), supabaseResponse);
    }
    if (authRole === "parent" && asRole !== "student") {
      return redirectWithCookies(request, homeFor("parent"), supabaseResponse);
    }
  }

  return supabaseResponse;
}

async function roleForAuthPage(studentToken: string, hasParent: boolean): Promise<Role | null> {
  if (!studentToken) return roleFromSession({ hasStudent: false, hasParent });
  try {
    const childId = await currentStudentId(studentToken);
    return roleFromSession({ hasStudent: Boolean(childId), hasParent });
  } catch {
    return roleFromSession({ hasStudent: false, hasParent });
  }
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
