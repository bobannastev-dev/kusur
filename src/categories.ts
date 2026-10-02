// Преглед на мапата на категории врз најновите ценовници.
// Употреба: npm run categories
//
// 1. Нови категории што ги нема во data/category-map.json (треба да се прегледаат).
// 2. Колку производи паѓаат во секој тип, по синџир.
// 3. Категории мапирани на еден тип од кои ниеден производ не поминал низ правилата
//    (во мешана категорија, на пр. „свеж зеленчук", нормално е некој тип денес да нема).

import { CATALOG } from "./catalog.ts";
import { CATEGORY_MAP, typesFor } from "./category-map.ts";
import { findCandidates, matchesType } from "./match.ts";
import { loadCurrentSnapshots } from "./price-store-file.ts";
import { STORES } from "./stores.ts";
import type { SnapshotFile } from "./types.ts";

const latest = await loadCurrentSnapshots(new Set(STORES.map((s) => s.id)));
console.log(`Ценовници од ${latest.dates.join(" – ")}: ${latest.snapshots.length} продавници\n`);

// Мапата е по синџир, па продавниците од ист синџир се спојуваат: секој производ
// (по име) еднаш, од која било продавница каде го има.
const snapshots: SnapshotFile[] = [...Map.groupBy(latest.snapshots, (s) => s.chain)]
  .sort(([a], [b]) => a.localeCompare(b, "mk"))
  .map(([chain, stores]) => ({
    ...stores[0],
    label: chain,
    offers: [...new Map(stores.flatMap((s) => s.offers).map((o) => [o.name, o] as const)).values()],
  }));

// 1. Нови категории
let newCount = 0;
for (const store of snapshots) {
  const fresh = new Map<string, string[]>();
  for (const o of store.offers) {
    if (typesFor(CATEGORY_MAP, store.chain, o.category) !== undefined) continue;
    const names = fresh.get(o.category) ?? [];
    names.push(o.name);
    fresh.set(o.category, names);
  }
  for (const [category, names] of fresh) {
    newCount++;
    console.log(`НОВА  ${store.chain} :: "${category}" (${names.length}) — ${names.slice(0, 3).join(" | ")}`);
  }
}
if (newCount === 0) console.log("Нови категории: нема.");

// 2. Покриеност по тип
console.log(`\n${"Тип".padEnd(36)}${snapshots.map((s) => s.chain.padStart(10)).join("")}`);
const empty: string[] = [];
for (const type of CATALOG) {
  const counts = snapshots.map((s) => findCandidates(s, type).length);
  console.log(`${type.label.slice(0, 35).padEnd(36)}${counts.map((c) => String(c || "·").padStart(10)).join("")}`);
  if (counts.every((c) => c === 0)) empty.push(type.label);
}

// 3. Сомнителни мапирања
const suspicious: string[] = [];
for (const store of snapshots) {
  const byCategory = Map.groupBy(store.offers, (o) => o.category);
  for (const [category, offers] of byCategory) {
    const ids = typesFor(CATEGORY_MAP, store.chain, category) ?? [];
    if (ids.length !== 1) continue;
    for (const id of ids) {
      const type = CATALOG.find((t) => t.id === id)!;
      if (!offers.some((o) => matchesType(o, store.chain, type))) {
        suspicious.push(`${store.chain} :: "${category}" → ${id} (${offers.length} производи, ниеден не поминал)`);
      }
    }
  }
}

console.log(`\nТипови без ниеден производ: ${empty.length ? empty.join(", ") : "нема"}`);
console.log(`Мапирања без ниеден производ: ${suspicious.length ? "" : "нема"}`);
for (const s of suspicious) console.log(`  ${s}`);
