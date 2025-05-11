import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only apply CORS headers to API calls
  const url = request.nextUrl.clone();

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the origin from the request or default to '*'
  const origin = request.headers.get("origin") || "*";

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add CORS headers to the response
  response.headers.set("Access-Control-Allow-Credentials", "true");

  // Allow any origin - this will make it work from any domain
  response.headers.set("Access-Control-Allow-Origin", "*");

  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: "/api/:path*",
};
