"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/signin" })}
      className="rounded-md border px-4 py-2 text-sm hover:bg-slate-50"
    >
      Sign out
    </button>
  );
}
