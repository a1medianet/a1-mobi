import { NextRequest, NextResponse } from "next/server";
import { currentStoreContext } from "@/server/auth-http";

// Customer-facing website and sign-in are public. All back-office pages require a VALID session.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const candidate = parts[0] === "product" ? parts[1] : parts[0];
  requestHeaders.set("x-a1-mobi-locale", candidate === "en" ? "en" : "ar");
  requestHeaders.set("x-a1-mobi-path", request.nextUrl.pathname);
  const isBackOffice = (parts[0] === "ar" || parts[0] === "en") &&
    !["login","recover"].includes(parts[1] || "");
  if (isBackOffice) {
    let authorized = false;
    try { authorized = Boolean(await currentStoreContext()); } catch { /* fail closed */ }
    if (!authorized) {
      const url = request.nextUrl.clone();
      url.pathname = "/" + parts[0] + "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
