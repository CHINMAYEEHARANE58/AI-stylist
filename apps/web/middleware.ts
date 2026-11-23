import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];
const AUTH_ONLY_PATHS = ["/dashboard", "/wardrobe", "/outfits", "/saved-outfits",
  "/style-item", "/pinterest-match", "/shopping", "/insights", "/profile", "/settings",
  "/notifications", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A refresh-only session must reach AuthBootstrap so it can rotate the
  // server-side refresh token and restore the short-lived access cookie.
  const accessToken = request.cookies.get("closetai_access")?.value;
  const refreshToken = request.cookies.get("closetai_refresh")?.value;
  const isAuthenticated = !!accessToken;
  const canRestoreSession = !!refreshToken;

  // If visiting an auth page while logged in, redirect to dashboard
  if (isAuthenticated && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If visiting a protected page without auth, redirect to login
  const isProtected = AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isAuthenticated && !canRestoreSession && isProtected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
