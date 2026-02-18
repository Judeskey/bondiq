// app/components/GoogleAnalytics.tsx
"use client";

import Script from "next/script";

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    __bondiq_ga_warned__?: boolean;
  }
}

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // If env is missing, do nothing (no crash).
  // Optional: warn once in dev.
  if (!gaId) {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if (!window.__bondiq_ga_warned__) {
        window.__bondiq_ga_warned__ = true;
        console.warn("[GA] NEXT_PUBLIC_GA_ID is missing — analytics disabled.");
      }
    }
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />

      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
