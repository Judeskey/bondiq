// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "bi_lp_v";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export default async function middleware(req: NextRequest) {
  // ✅ Keep your original intention: no auth logic here.
  // (Edge middleware + DB session strategies can be unreliable)

  // ✅ Only do the A/B cookie assignment for the landing page "/"
  const { pathname } = req.nextUrl;
  if (pathname !== "/") return NextResponse.next();

  // If already assigned, do nothing
  const existing = req.cookies.get(COOKIE_NAME)?.value?.toUpperCase();
  if (existing && ["A", "B", "C"].includes(existing)) {
    return NextResponse.next();
  }

  // Choose a variant server-side by calling our API (no-store)
  try {
    const res = await fetch(new URL("/api/exp/choose", req.url), {
      cache: "no-store",
      headers: { "x-from-middleware": "1" },
    });

    const data = await res.json().catch(() => null);
    const variant = String(data?.variant || "").toUpperCase();

    if (!["A", "B", "C"].includes(variant)) {
      return NextResponse.next();
    }

    const out = NextResponse.next();
    out.cookies.set(COOKIE_NAME, variant, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });

    return out;
  } catch {
    return NextResponse.next();
  }
}

// ✅ Only run middleware on the landing page
export const config = {
  matcher: ["/"],
};
