// app/signin/page.tsx
import type { Metadata } from "next";
import Image from "next/image";
import SignInClient from "./sign-in-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in • BondIQ",
  description:
    "Sign in to BondIQ to access your weekly relationship reflections, insights, and gratitude vault.",

  alternates: {
    canonical: "/signin",
  },

  robots: {
    index: false, // ❗ signin pages should not be indexed
    follow: false,
  },

  openGraph: {
    type: "website",
    url: "/signin",
    title: "Sign in to BondIQ",
    description:
      "Access your BondIQ relationship insights and weekly reflections.",
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
    title: "Sign in • BondIQ",
    description:
      "Sign in to access your BondIQ reflections and insights.",
    images: ["/landing/couple-hero.png"],
  },
};

type Props = {
  searchParams?: {
    callbackUrl?: string;
    error?: string;
  };
};

export default function SignInPage({ searchParams }: Props) {
  const callbackUrl = searchParams?.callbackUrl || "/app/reports";
  const errorCode = searchParams?.error;

  return (
    <main className="min-h-[calc(100vh-0px)] px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="BondIQ logo"
              width={56}
              height={56}
              priority
              className="h-14 w-auto"
            />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to BondIQ
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Relationship intelligence, made human.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <SignInClient callbackUrl={callbackUrl} errorCode={errorCode} />
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to BondIQ’s terms and privacy policy.
        </p>
      </div>
    </main>
  );
}
