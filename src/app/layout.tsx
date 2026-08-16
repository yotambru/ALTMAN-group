import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/store";
import { CapacitorBootstrap } from "@/components/native/CapacitorBootstrap";
import { OfflineBanner } from "@/components/native/OfflineBanner";
import { PersistBanner } from "@/components/native/PersistBanner";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ALTMAN Group — ניהול נכסים ושכירויות",
  description:
    "מערכת ניהול נכסים ושכירויות של ALTMAN Group — דשבורד למנהל, למשכיר ולשוכר.",
  appleWebApp: {
    capable: true,
    title: "ALTMAN Group",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#14285a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DataProvider>
          <CapacitorBootstrap />
          <OfflineBanner />
          <PersistBanner />
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
