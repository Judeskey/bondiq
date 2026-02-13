export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { handlers } from "@/auth";

// NextAuth needs GET + POST in App Router
export const { GET, POST } = handlers;
