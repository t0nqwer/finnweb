import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/subscription",
  "/billing",
  "/sites",
  "/settings",
  "/help",
];
const guestOnlyPrefixes = ["/login", "/register"];
const ACCESS_COOKIE_NAME = "finnweb_access_token";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isGuestOnlyRoute = guestOnlyPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isProtectedRoute && !accessToken) {
    const redirectUrl = new URL("/register", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isGuestOnlyRoute && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/subscription/:path*",
    "/billing/:path*",
    "/sites/:path*",
    "/settings/:path*",
    "/help/:path*",
    "/login/:path*",
    "/register/:path*",
  ],
};
