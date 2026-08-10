import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/admin/login", "/api/auth/login", "/api/bg", "/api/recepcao/scan", "/api/ticket", "/api/reset"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    const token = req.cookies.get("lm_admin_session")?.value;
    if (!token) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

