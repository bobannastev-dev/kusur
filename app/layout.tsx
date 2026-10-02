import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import type { ReactNode } from "react";
import { BottomNav } from "./components/BottomNav.tsx";
import { ServiceWorker } from "./components/ServiceWorker.tsx";
import { TopBar } from "./components/TopBar.tsx";
import { PriceDataProvider } from "./lib/data.tsx";
import { THEME_BOOT_SCRIPT } from "./lib/theme-script.ts";
import "./globals.css";

// Двата фонта имаат кирилица; Next ги хостира заедно со апликацијата.
const text = Onest({ subsets: ["cyrillic", "latin"], variable: "--font-text", display: "swap" });
const display = Unbounded({ subsets: ["cyrillic", "latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Кусур — каде е поевтино",
  description: "Каде е најевтина целата кошничка во Велес — цени од маркетите секој ден.",
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "Кусур", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6e6cf" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1411" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme го поставува скриптата пред React, па атрибутот смее да се разликува.
    <html lang="mk" className={`${text.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <PriceDataProvider>
          <TopBar />
          {children}
          <BottomNav />
          <ServiceWorker />
        </PriceDataProvider>
      </body>
    </html>
  );
}
