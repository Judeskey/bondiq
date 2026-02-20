// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";
import { Toaster } from "react-hot-toast";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";

export const metadata: Metadata = {
  // ✅ SEO-optimized titles
  title: {
    default: "BondIQ — Relationship Intelligence App for Couples",
    template: "%s | BondIQ",
  },

  description:
    "BondIQ is a relationship intelligence app for couples. Weekly reflections, emotional insights, gratitude vault, and gentle repair suggestions to build stronger relationships.",

  applicationName: "BondIQ",

  // ✅ Keywords help search engines understand context
  keywords: [
    "relationship app",
    "couples app",
    "relationship check-in app",
    "relationship tracker for couples",
    "marriage improvement app",
    "couples journal",
    "relationship insights",
  ],

  // ✅ Required for proper canonical URLs
  metadataBase: new URL("https://bondiq.app"),

  // ✅ PWA
  manifest: "/manifest.json",

  // ✅ OpenGraph (social previews + SEO signal)
  openGraph: {
    title: "BondIQ — Relationship Intelligence for Couples",
    description:
      "Turn small check-ins into calm clarity. Insights, gratitude, and gentle repair suggestions for real couples.",
    url: "https://bondiq.app",
    siteName: "BondIQ",
    type: "website",
  },

  // ✅ Robots directives
  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BondIQ",
  },

  formatDetection: { telephone: false },
};

// ✅ Next.js wants themeColor in `viewport`, not `metadata`
export const viewport: Viewport = {
  themeColor: "#ec4899",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <PwaRegister />

        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: "16px",
              background: "#fff",
              color: "#333",
              padding: "12px 16px",
            },
          }}
        />

        <GoogleAnalytics />

        {children}
      </body>
    </html>
  );
}