"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (ran.current) return;
    ran.current = true;

    async function run() {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Unable to accept invite");
        return;
      }

      // ✅ remove token from URL after success
      router.replace("/app/onboarding");
      router.refresh();
    }

    run();
  }, [token, router]);

  if (!token) return null;

  if (error) {
    return (
      <div className="mx-auto mt-6 max-w-2xl rounded-md border bg-white p-4 text-sm">
        <b>Invite issue:</b> {error}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-md border bg-white p-4 text-sm">
      Connecting you to your partner…
    </div>
  );
}
