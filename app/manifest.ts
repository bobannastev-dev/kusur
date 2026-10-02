// Додавање на почетниот екран на телефонот.

import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Кусур — каде е поевтино",
    short_name: "Кусур",
    description: "Каде е најевтина целата кошничка во Велес — цени од маркетите секој ден.",
    lang: "mk",
    start_url: "/",
    display: "standalone",
    background_color: "#f6e6cf",
    theme_color: "#f6e6cf",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
