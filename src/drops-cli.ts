// Поевтинето по тип производ од даден датум.
// Употреба: npm run drops -- --since 2026-10-01 "млеко, кафе, јајца"

import { CATALOG } from "./catalog.ts";
import { allSeries, dropsSince, historyStart, promoCheck, PROMO_VERDICT_TEXT, DROP_THRESHOLD } from "./history.ts";
import { parseList } from "./list.ts";
import { loadHistories } from "./history-load.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { STORES } from "./stores.ts";
import type { Unit } from "./types.ts";

const args = process.argv.slice(2);
const flag = args.indexOf("--since");
const since = flag !== -1 ? args.splice(flag, 2)[1] : undefined;
const input = args.join(" ").trim();

if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since) || !input) {
  console.error('Употреба: npm run drops -- --since YYYY-MM-DD "млеко, кафе, јајца"');
  console.error(`Познати производи: ${CATALOG.map((t) => t.aliases[0]).join(", ")}`);
  process.exit(1);
}

const { lines, unknown } = parseList(input);
const types = [...new Map(lines.map((l) => [l.type.id, l.type])).values()];
if (types.length === 0) {
  console.error(`Не препознав ниту еден производ: ${unknown.join(", ")}`);
  process.exit(1);
}

const histories = await loadHistories(createFilePriceStore(), new Set(STORES.map((s) => s.id)));
const byStore = new Map(histories.map((h) => [h.snapshot.storeId, h]));
const seriesByStore = new Map(histories.map((h) => [h.snapshot.storeId, allSeries(h.changes, { date: h.date, offers: h.snapshot.offers })]));

const den = (n: number) => `${n.toLocaleString("mk-MK")} ден.`;
const UNIT: Record<Unit, string> = { kg: "кг", l: "л", pc: "парче" };
const percent = (from: number, to: number) => `−${Math.round((1 - to / from) * 100)}%`;

const results = dropsSince(histories, types, since);
const effective = results[0].since;
console.log(`Поевтинето ${Math.round(DROP_THRESHOLD * 100)}% или повеќе од ${effective} до денес${results[0].sinceAdjusted ? ` (историјата почнува на ${effective})` : ""}`);
if (unknown.length) console.log(`Не препознав: ${unknown.join(", ")}`);

for (const r of results) {
  console.log(`\n${r.type.label}`);
  const { then, now, dropped } = r.cheapest;
  const unit = UNIT[r.type.unit];
  if (now) {
    const before = then ? `${den(then.unitPrice)}/${unit} (${then.offer.name} @ ${then.store.label})` : "нема";
    console.log(`  Најевтино по ${unit}: тогаш ${before}`);
    console.log(`                 денес ${den(now.unitPrice)}/${unit} (${now.offer.name} @ ${now.store.label})${dropped && then ? `  ${percent(then.unitPrice, now.unitPrice)}` : ""}`);
  } else {
    console.log("  Денес го нема во ниту една продавница.");
  }

  if (r.drops.length === 0) {
    console.log("  Поевтинети производи: нема");
    continue;
  }
  console.log("  Поевтинети производи:");
  for (const d of r.drops.sort((a, b) => b.oldPrice / b.newPrice - a.oldPrice / a.newPrice)) {
    const h = byStore.get(d.store.storeId)!;
    const check = promoCheck(d.offer, seriesByStore.get(d.store.storeId)!.get(d.offer.name) ?? [], historyStart(h));
    const promo = check.verdict === "not-on-promo" ? "" : `\n        акција: ${PROMO_VERDICT_TEXT[check.verdict]}`;
    console.log(`    ${den(d.oldPrice)} → ${den(d.newPrice)} ${percent(d.oldPrice, d.newPrice)}  ${d.offer.name} @ ${d.store.label}${promo}`);
  }
}
