import { NextRequest, NextResponse } from "next/server";

// Rendering hint only: authentication and tenant authority stay server-side.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const segment = request.nextUrl.pathname.split("/")[1];
  requestHeaders.set("x-a1-mobi-locale", segment === "en" ? "en" : "ar");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
