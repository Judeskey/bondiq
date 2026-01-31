
# Resonance MVP (Web + PWA)

## Quickstart
1) Copy `.env.example` to `.env` and fill values.
2) Install deps:
   - `npm install`
3) Prisma:
   - `npx prisma generate`
   - `npx prisma migrate dev --name init`
4) Run:
   - `npm run dev`
5) Open:
   - http://localhost:3000

## Auth
- Auth.js (NextAuth v5) config: `auth.ts`
- Handler route: `app/api/auth/[...nextauth]/route.ts`
- Sign in page: `app/signin/page.tsx` (Resend magic link)

## PWA
- Manifest: `app/manifest.ts`
- Service worker: `public/sw.js`
