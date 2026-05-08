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
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "finnweb.site";
const RESERVED_SUBDOMAINS = new Set(["www", "app", "api"]);

function getTenantSlug(hostHeader: string | null) {
  if (!hostHeader) {
    return null;
  }

  const host = hostHeader.toLowerCase().split(":")[0] ?? "";

  if (!host.endsWith(`.${ROOT_DOMAIN}`)) {
    return null;
  }

  const subdomain = host.slice(0, -`.${ROOT_DOMAIN}`.length);

  if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

function getPublicOrigin(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto =
    forwardedProto?.split(",")[0]?.trim() ||
    request.nextUrl.protocol.replace(":", "");

  return `${proto}://${host}`;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const tenantSlug = getTenantSlug(request.headers.get("host"));

  if (tenantSlug) {
    const pagePath = pathname === "/" ? "" : pathname.replace(/^\/+/, "");
    const rewritePath = pagePath
      ? `/s/${tenantSlug}/${pagePath}`
      : `/s/${tenantSlug}`;
    const rewriteUrl = new URL(rewritePath, getPublicOrigin(request));

    return NextResponse.rewrite(rewriteUrl);
  }

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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
