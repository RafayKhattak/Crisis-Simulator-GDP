import { NextRequest, NextResponse } from "next/server";
import { peekSession, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.startsWith("/android-chrome") ||
    pathname.startsWith("/brand") ||
    pathname === "/site.webmanifest" ||
    pathname === "/icon.svg"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = peekSession(token);

  if (PUBLIC_PATHS.has(pathname)) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
