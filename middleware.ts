import { NextRequest, NextResponse } from "next/server";

// Routes that require the API key
const PROTECTED_PREFIXES = [
  "/api/folders",
  "/api/files",
  "/api/upload",
  "/api/download",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const apiKey = request.headers.get("x-api-key");
  const expected = process.env.API_SECRET_KEY;

  if (!expected || apiKey !== expected) {
    return NextResponse.json(
      { error: "Unauthorized. Missing or invalid API key." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/folders/:path*", "/api/files/:path*", "/api/upload/:path*", "/api/download/:path*"],
};
