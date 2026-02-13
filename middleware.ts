// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(_req: NextRequest) {
  // Intentionally no auth logic here.
  // Database session strategy + Prisma adapter is not reliable in Edge middleware.
  return NextResponse.next();
}

// Match nothing (disables middleware for all routes)
export const config = {
  matcher: [],
};
