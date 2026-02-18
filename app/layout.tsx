// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "@/components/PwaRegister";
import { Toaster } from "react-hot-toast";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";

export const metadata: Metadata = {
  title: "BondIQ — Relationship intelligence, made human",
  description: "Gentle, practical weekly reflections for real couples.",
  applicationName: "BondIQ",

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
