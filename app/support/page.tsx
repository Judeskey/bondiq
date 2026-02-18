// app/support/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import SupportClient from "./SupportClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Support • BondIQ",
  description:
    "Contact BondIQ support for help with your account, billing, privacy, or technical issues. We reply to all messages and prioritize your safety and trust.",
  alternates: {
    canonical: "/support",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/support",
    title: "BondIQ Support",
    description:
      "Need help? Contact BondIQ support for account, billing, or privacy questions.",
    siteName: "BondIQ",
    images: [
      {
        url: "/landing/couple-hero.png",
        width: 1200,
        height: 630,
        alt: "BondIQ — Relationship intelligence, made human",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support • BondIQ",
    description:
      "Get help from BondIQ support for account, billing, or technical issues.",
    images: ["/landing/couple-hero.png"],
  },
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white">
      <Suspense fallback={<SupportFallback />}>
        <SupportClient />
      </Suspense>
    </main>
  );
}

function SupportFallback() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="h-5 w-40 rounded bg-slate-100" />
        <div className="mt-3 h-4 w-72 rounded bg-slate-100" />
        <div className="mt-6 h-10 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}
