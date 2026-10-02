// Предлози на тип за непрегледаните производи на синџирите без категории (КАМ).
// Употреба: npm run propose
//
// Пишува data/review/<синџир>-proposals.json, групирано по предложен тип, за преглед.
// Во data/product-map.json не пишува ништо: таму влегува само прегледано.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCurrentSnapshots } from "./price-store.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { proposeTypes } from "./propose.ts";
import { STORES } from "./stores.ts";
import { mapsByProduct, reviewedTypes, TYPE_MAPS } from "./type-maps.ts";

const REVIEW_DIR = path.join(import.meta.dirname, "..", "data", "review");

const latest = await loadCurrentSnapshots(createFilePriceStore(), new Set(STORES.map((s) => s.id)));
const chains = [...new Set(latest.snapshots.map((s) => s.chain))].filter((c) => mapsByProduct(TYPE_MAPS, c));

for (const chain of chains) {
  // Секој производ (по име) еднаш, од која било продавница на синџирот.
  const offers = new Map(latest.snapshots.filter((s) => s.chain === chain).flatMap((s) => s.offers).map((o) => [o.name, o]));
  const groups: Record<string, { name: string; description: string }[]> = {};
  let proposed = 0;
  let nonFood = 0;
  for (const offer of offers.values()) {
    if (reviewedTypes(TYPE_MAPS, chain, offer) !== undefined) continue;
    const p = proposeTypes(offer);
    const key = p.nonFood ? "(непрехрана)" : p.types.length ? p.types.join(",") : "(без предлог)";
    if (p.nonFood) nonFood++;
    else if (p.types.length) proposed++;
    (groups[key] ??= []).push({ name: offer.name, description: offer.description });
  }

  const sorted = Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
  const file = path.join(REVIEW_DIR, `${chain}-proposals.json`);
  await mkdir(REVIEW_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(sorted, null, 1) + "\n", "utf8");

  const total = Object.values(groups).reduce((n, g) => n + g.length, 0);
  console.log(`${chain}: ${total} непрегледани — ${proposed} со предлог, ${nonFood} непрехрана, ${total - proposed - nonFood} без предлог`);
  console.log(`  → ${path.relative(process.cwd(), file)}`);
}
