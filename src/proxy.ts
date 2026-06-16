import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;

  // ── Public routes ────────────────────────────────────────
  if (pathname.startsWith("/login")) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Protected routes — must be logged in ─────────────────
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      // jwt() returns null when a user is deactivated mid-session.
      // NextAuth treats a null token as no session, so !isLoggedIn
      // catches both "never logged in" and "deactivated while logged in."
      const loginUrl = new URL("/login", req.nextUrl);
      loginUrl.searchParams.set("error", "SessionExpired");
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── Block salespeople from admin + team routes ──────────
    if (pathname.startsWith("/dashboard/admin") && role !== "manager") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }

    if (pathname.startsWith("/dashboard/team") && role !== "manager") {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};