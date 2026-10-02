// Next.js: статичка апликација (out/), без сервер. Цените ги пресметува телефонот
// од public/data/*.json (npm run build-data).

import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// npm run dev од телефон на иста Wi‑Fi мрежа: Next 16 ги блокира развојните ресурси за
// други адреси освен localhost, па ги дозволуваме адресите на овој компјутер во мрежата.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => a!.address);

const config: NextConfig = {
  output: "export",
  allowedDevOrigins: lanAddresses,
  trailingSlash: true,
  typescript: {
    // Посебна поставка за апликацијата; tsconfig.json останува за командите.
    tsconfigPath: "tsconfig.app.json",
    // Типовите ги проверува npm run typecheck (TypeScript 7), не next build.
    ignoreBuildErrors: true,
  },
};

export default config;
