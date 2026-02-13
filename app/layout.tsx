
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { Toaster } from "react-hot-toast";

<Toaster
  position="top-center"
  toastOptions={{
    style:{
      borderRadius:"16px",
      background:"#fff",
      color:"#333",
      padding:"12px 16px"
    }
  }}
/>

export const metadata = {
  title: "BondIQ",
  description: "Weekly relationship insights that help love land.",
  applicationName: "BondIQ",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BondIQ" },
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
