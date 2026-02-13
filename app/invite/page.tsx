// app/invite/page.tsx
import { Suspense } from "react";
import InviteClient from "./InviteClient";

export default function InvitePage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">Invite</h1>
      <Suspense fallback={<div className="mt-6 text-sm text-slate-600">Loading…</div>}>
        <InviteClient />
      </Suspense>
    </main>
  );
}
