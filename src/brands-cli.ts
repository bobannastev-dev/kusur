// Преглед на брендовите врз најновите ценовници.
// Употреба: npm run brands               — покриеност по тип (типовите од data/brands.json)
//           npm run brands -- prashok    — брендовите на типот и најчестите зборови
//                                          кај производите без бренд (за дополнување)
//           npm run brands -- prashok --all — и сите производи без бренд
//
// Предлозите не одат во data/brands.json сами — одлучува човек.

import { CATALOG, TYPES_BY_ID, type ProductType } from "./catalog.ts";
import { findCandidates, type Candidate } from "./match.ts";
import { loadCurrentSnapshots } from "./price-store.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { STORES } from "./stores.ts";
import { defaultTypeMaps } from "./type-maps.ts";

const maps = defaultTypeMaps();
const brands = maps.brands ?? {};
const latest = await loadCurrentSnapshots(createFilePriceStore(), new Set(STORES.map((s) => s.id)));

/** Кандидатите на типот низ сите продавници, секој производ еднаш по синџир. */
function candidatesOf(type: ProductType): (Candidate & { chain: string })[] {
  const seen = new Map<string, Candidate & { chain: string }>();
  for (const store of latest.snapshots) {
    for (const c of findCandidates(store, type, maps)) seen.set(`${store.chain}|${c.offer.name}`, { ...c, chain: store.chain });
  }
  return [...seen.values()];
}

const pct = (part: number, all: number) => (all ? Math.round((part / all) * 100) : 0);

const typeId = process.argv[2];
if (!typeId) {
  const typeIds = [...new Set(Object.values(brands).flatMap((b) => b.types))];
  console.log(`Брендови: ${Object.keys(brands).length}, типови: ${typeIds.length} (ценовници од ${latest.dates.join(" – ")})\n`);
  for (const type of CATALOG.filter((t) => typeIds.includes(t.id))) {
    const list = candidatesOf(type);
    const branded = list.filter((c) => c.brand).length;
    const count = new Set(list.map((c) => c.brand).filter(Boolean)).size;
    console.log(`${String(pct(branded, list.length)).padStart(3)}%  ${type.id} — ${branded}/${list.length} производи, ${count} бренда`);
  }
  process.exit(0);
}

const type = TYPES_BY_ID.get(typeId);
if (!type) {
  console.error(`Непознат тип: ${typeId}`);
  process.exit(1);
}

const list = candidatesOf(type);
const branded = list.filter((c) => c.brand);
console.log(`${type.label}: ${branded.length}/${list.length} производи со бренд (${pct(branded.length, list.length)}%)\n`);

for (const [id, items] of Map.groupBy(branded, (c) => c.brand!)) {
  const chains = [...new Set(items.map((c) => c.chain))].join(", ");
  console.log(`  ${brands[id].label} — ${items.length} (${chains})`);
}

const unbranded = list.filter((c) => !c.brand);
if (process.argv.includes("--all")) {
  console.log(`\nБез бренд (${unbranded.length}):`);
  for (const c of unbranded.sort((a, b) => a.offer.name.localeCompare(b.offer.name, "mk"))) {
    console.log(`  ${c.chain}: ${c.offer.name}${c.offer.description ? ` — ${c.offer.description}` : ""}`);
  }
  process.exit(0);
}

// Зборовите на производите без бренд: најчестите се веројатно брендови (или видот на производот).
const words = new Map<string, Set<string>>();
for (const c of unbranded) {
  const text = `${c.offer.name} ${c.offer.description}`.toUpperCase();
  for (const w of new Set(text.split(/[^\p{L}]+/u).filter((w) => w.length >= 3))) {
    const names = words.get(w) ?? new Set<string>();
    names.add(`${c.chain}: ${c.offer.name}`);
    words.set(w, names);
  }
}
const top = [...words].sort((a, b) => b[1].size - a[1].size).slice(0, 30);
console.log(`\nБез бренд: ${list.length - branded.length}. Најчести зборови:`);
for (const [w, names] of top) console.log(`  ${String(names.size).padStart(3)}  ${w}  — на пр. ${[...names][0]}`);
