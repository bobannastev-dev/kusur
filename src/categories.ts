// Преглед на мапата на категории врз најновите ценовници.
// Употреба: npm run categories
//
// 1. Нови категории што ги нема во data/category-map.json (треба да се прегледаат);
//    кај синџирите без категории (КАМ) — непрегледани производи од data/product-map.json.
// 2. Колку производи паѓаат во секој тип, по синџир.
// 3. Категории мапирани на еден тип од кои ниеден производ не поминал низ правилата
//    (во мешана категорија, на пр. „свеж зеленчук", нормално е некој тип денес да нема).

import { CATALOG } from "./catalog.ts";
import { findCandidates, matchesType } from "./match.ts";
import { loadCurrentSnapshots } from "./price-store.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { STORES } from "./stores.ts";
import { defaultTypeMaps, mapsByProduct, reviewedTypes } from "./type-maps.ts";
import type { SnapshotFile } from "./types.ts";

const TYPE_MAPS = defaultTypeMaps();

const latest = await loadCurrentSnapshots(createFilePriceStore(), new Set(STORES.map((s) => s.id)));
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

// 1. Нови категории; непрегледани производи
let newCount = 0;
for (const store of snapshots.filter((s) => mapsByProduct(TYPE_MAPS, s.chain))) {
  const unreviewed = store.offers.filter((o) => reviewedTypes(TYPE_MAPS, store.chain, o) === undefined);
  console.log(`${store.chain}: непрегледани производи ${unreviewed.length} од ${store.offers.length} (npm run propose)`);
  for (const o of unreviewed.slice(0, 10)) console.log(`  ${o.name} — ${o.description}`);
  if (unreviewed.length > 10) console.log(`  … уште ${unreviewed.length - 10}`);
}
for (const store of snapshots.filter((s) => !mapsByProduct(TYPE_MAPS, s.chain))) {
  const fresh = new Map<string, string[]>();
  for (const o of store.offers) {
    if (reviewedTypes(TYPE_MAPS, store.chain, o) !== undefined) continue;
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

// 3. Сомнителни мапирања: категорија од која ниеден производ не поминал правилата,
//    или производ (КАМ) мапиран на тип што правилата го одбиваат.
const suspicious: string[] = [];
for (const store of snapshots.filter((s) => !mapsByProduct(TYPE_MAPS, s.chain))) {
  const byCategory = Map.groupBy(store.offers, (o) => o.category);
  for (const [category, offers] of byCategory) {
    const ids = reviewedTypes(TYPE_MAPS, store.chain, offers[0]) ?? [];
    if (ids.length !== 1) continue;
    for (const id of ids) {
      const type = CATALOG.find((t) => t.id === id)!;
      if (!offers.some((o) => matchesType(o, store.chain, type))) {
        suspicious.push(`${store.chain} :: "${category}" → ${id} (${offers.length} производи, ниеден не поминал)`);
      }
    }
  }
}
// Кај мапата на производи: запис со тип што правилата по име го одбиваат нема ефект.
for (const store of snapshots.filter((s) => mapsByProduct(TYPE_MAPS, s.chain))) {
  for (const o of store.offers) {
    for (const id of reviewedTypes(TYPE_MAPS, store.chain, o) ?? []) {
      const type = CATALOG.find((t) => t.id === id)!;
      if (!matchesType(o, store.chain, type)) suspicious.push(`${store.chain} :: „${o.name}" → ${id} (правилата по име го одбиваат)`);
    }
  }
}

// 4. Видови акција по синџир: нов вид (на пр. уште една клуб-цена) треба да се
//    разгледа во comparisonPrice (src/match.ts).
console.log("\nВидови акција:");
for (const store of snapshots) {
  const kinds = Map.groupBy(store.offers.filter((o) => o.promoKind), (o) => o.promoKind!);
  const list = [...kinds].map(([kind, offers]) => `${kind} ${offers.length}`).join(", ");
  console.log(`  ${store.chain}: ${list || "нема"}`);
}

console.log(`\nТипови без ниеден производ: ${empty.length ? empty.join(", ") : "нема"}`);
console.log(`Мапирања без ниеден производ: ${suspicious.length ? "" : "нема"}`);
for (const s of suspicious) console.log(`  ${s}`);
