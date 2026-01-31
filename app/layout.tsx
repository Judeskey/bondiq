
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata = {
  title: "Resonance",
  description: "Weekly relationship insights that help love land.",
  applicationName: "Resonance",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Resonance" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
