// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "@/components/PwaRegister";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "BondIQ — Relationship intelligence, made human",
  description: "Gentle, practical weekly reflections for real couples.",
  applicationName: "BondIQ",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      // Optional PNG favicons if you add them later:
      // { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      // { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BondIQ",
  },

  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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

        {children}
      </body>
    </html>
  );
}
