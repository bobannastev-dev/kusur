// Историја на цената на еден производ во една продавница.
// Употреба: npm run history -- ramstore-veles "ВИТАМИНКА МЕКО КОЛАЧЕ ФРУТИ МАЛИНА 112Г"

import { historyStart, priceSeries, promoCheck, PROMO_VERDICT_TEXT } from "./history.ts";
import { loadHistories } from "./price-store.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { STORES } from "./stores.ts";

const [storeId, ...rest] = process.argv.slice(2);
const name = rest.join(" ").trim();
if (!storeId || !name) {
  console.error('Употреба: npm run history -- <продавница> "<име на производ>"');
  console.error(`Продавници: ${STORES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const [h] = await loadHistories(createFilePriceStore(), new Set([storeId]));
if (!h) {
  console.error(`Нема податоци за продавница „${storeId}".`);
  process.exit(1);
}

const needle = name.toUpperCase();
const offer = h.snapshot.offers.find((o) => o.name.toUpperCase() === needle);
const series = priceSeries(h.changes, { date: h.date, offer }, offer?.name ?? needle);
if (series.length === 0) {
  const similar = h.snapshot.offers.filter((o) => o.name.toUpperCase().includes(needle)).slice(0, 10);
  console.error(`Нема производ „${name}" во ${h.snapshot.label}.${similar.length ? ` Слични:\n  ${similar.map((o) => o.name).join("\n  ")}` : ""}`);
  process.exit(1);
}

const den = (n: number) => `${n.toLocaleString("mk-MK")} ден.`;
console.log(`${offer?.name ?? name} @ ${h.snapshot.label} (историја од ${historyStart(h)})\n`);
for (const p of series) console.log(`  ${p.date}  ${p.price === null ? "го нема" : den(p.price)}${p.added ? "  (се појавува)" : ""}`);

if (offer) {
  const check = promoCheck(offer, series, historyStart(h));
  const regular = offer.regularPrice && offer.regularPrice !== offer.price ? `, редовна ${den(offer.regularPrice)}` : "";
  console.log(`\nДенес: ${den(offer.price)}${regular}${offer.promoKind ? ` — ${offer.promoKind}` : ""}`);
  if (check.verdict !== "not-on-promo") {
    console.log(`Акција${check.loyalty ? " (со клуб-картичка)" : ""}: ${PROMO_VERDICT_TEXT[check.verdict]}`);
    if (check.promoStart) console.log(`  од ${check.promoStart}${check.lowestBefore !== null ? `; најниско во 30-те дена пред: ${den(check.lowestBefore)}` : ""}`);
  }
} else {
  console.log("\nДенес го нема во ценовникот.");
}
