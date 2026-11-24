// Sends visitors without a session cookie back to the login page.
// (The cookie's signature is checked by the API on every request.)
import { NextResponse } from "next/server";

export function middleware(req) {
  const hasSession = req.cookies.has("bhrm_session");
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/auth") && !hasSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*"],
};
