// app/pricing/page.tsx
import type { Metadata } from "next";
import PricingClient from "./PricingClient";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "Pricing — BondIQ",
  description:
    "Choose the plan that fits your relationship journey. Upgrade to Premium for partner visibility, deeper insights, and more.",
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
