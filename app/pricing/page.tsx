// app/pricing/page.tsx
import type { Metadata } from "next";
import PricingClient from "./PricingClient";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "BondIQ Pricing — Relationship App for Couples",
  description:
    "Explore BondIQ pricing. Start free or upgrade to Premium for deeper relationship insights, partner visibility, gratitude vault, and weekly reflections for couples.",

  keywords: [
    "relationship app pricing",
    "couples app pricing",
    "relationship tracker cost",
    "marriage app subscription",
    "couples relationship app price",
  ],

  openGraph: {
    title: "BondIQ Pricing — Relationship Intelligence for Couples",
    description:
      "See BondIQ plans and pricing. Upgrade to Premium for deeper insights and relationship growth tools.",
    url: "https://bondiq.app/pricing",
    type: "website",
  },

  alternates: {
    canonical: "https://bondiq.app/pricing",
  },
};

export default function PricingPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const checkout =
    typeof searchParams?.checkout === "string" ? searchParams.checkout : undefined;

  const sessionId =
    typeof searchParams?.session_id === "string" ? searchParams.session_id : undefined;

  return (
    <main className="min-h-screen bg-white">
      <PricingClient checkout={checkout} sessionId={sessionId} />
      <SiteFooter />
    </main>
  );
}
