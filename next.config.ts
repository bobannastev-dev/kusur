// Next.js: статичка апликација (out/), без сервер. Цените ги пресметува телефонот
// од public/data/*.json (npm run build-data).

import type { NextConfig } from "next";

const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  typescript: {
    // Посебна поставка за апликацијата; tsconfig.json останува за командите.
    tsconfigPath: "tsconfig.app.json",
    // Типовите ги проверува npm run typecheck (TypeScript 7), не next build.
    ignoreBuildErrors: true,
  },
};

export default config;
