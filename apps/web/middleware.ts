import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];
const AUTH_ONLY_PATHS = ["/dashboard", "/wardrobe", "/outfits", "/saved-outfits",
  "/style-item", "/pinterest-match", "/shopping", "/insights", "/profile", "/settings",
  "/notifications", "/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the user has an access cookie
  const accessToken = request.cookies.get("closetai_access")?.value;
  const isAuthenticated = !!accessToken;

  // If visiting an auth page while logged in, redirect to dashboard
  if (isAuthenticated && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If visiting a protected page without auth, redirect to login
  const isProtected = AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!isAuthenticated && isProtected) {
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
