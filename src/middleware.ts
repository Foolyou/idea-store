import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;

  if (sessionToken) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-token", sessionToken);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
