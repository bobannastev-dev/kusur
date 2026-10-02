import type { Metadata, Viewport } from "next";
import { Onest, Unbounded } from "next/font/google";
import type { ReactNode } from "react";
import { BottomNav } from "./components/BottomNav.tsx";
import { PriceDataProvider } from "./lib/data.tsx";
import "./globals.css";

// Двата фонта имаат кирилица; Next ги хостира заедно со апликацијата.
const text = Onest({ subsets: ["cyrillic", "latin"], variable: "--font-text", display: "swap" });
const display = Unbounded({ subsets: ["cyrillic", "latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Каде поевтино?",
  description: "Каде е најевтина целата кошничка во Велес — цени од маркетите секој ден.",
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
    <html lang="mk" className={`${text.variable} ${display.variable}`}>
      <body>
        <PriceDataProvider>
          {children}
          <BottomNav />
        </PriceDataProvider>
      </body>
    </html>
  );
}
