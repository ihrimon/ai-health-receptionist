import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";

/**
 * UX-only gate — redirects to /admin/login when the session cookie is
 * simply absent. It does not verify the cookie's signature (that would
 * need to duplicate AuthService's HMAC check in the edge runtime); the
 * real security boundary is AdminAuthGuard on the API, which every
 * /admin/* page's data actually goes through.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
