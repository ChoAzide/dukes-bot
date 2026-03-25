import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/auth.js";

export async function middleware(req: NextRequest) {
  const session = await auth();
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname === "/login") return NextResponse.next();

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!(session as any).isAdmin) {
    return new NextResponse("Not authorized", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

