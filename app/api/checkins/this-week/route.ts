// app/api/checkins/this-week/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  url.pathname = "/api/checkins/week";
  url.search = ""; // keep it clean; week route computes this week
  return NextResponse.redirect(url);
}
