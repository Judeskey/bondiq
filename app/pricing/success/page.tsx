// app/pricing/success/page.tsx
import type { Metadata } from "next";
import SuccessClient from "./success-client";

export const metadata: Metadata = {
  title: "Payment successful — BondIQ",
  description: "Your subscription is active. Manage billing and view your reports.",
};

export default function PricingSuccessPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const sessionId =
    typeof searchParams?.session_id === "string" ? searchParams.session_id : undefined;

  return (
    <main className="min-h-screen bg-white">
      <SuccessClient sessionId={sessionId} />
    </main>
  );
}
