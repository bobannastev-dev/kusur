// Споредба на кошничка од командна линија.
// Употреба: npm run basket -- "млеко, 10 јајца, сирење, кафе и прашок за перење"
//           npm run basket -- --max-stores 1 "леб, млеко, јогурт"

import { compareBasket, type Plan } from "./basket.ts";
import { CATALOG } from "./catalog.ts";
import { parseList } from "./list.ts";
import { loadLatestSnapshots } from "./snapshots.ts";
import type { Unit } from "./types.ts";

const args = process.argv.slice(2);
let maxStores = 2;
const flag = args.indexOf("--max-stores");
if (flag !== -1) {
  maxStores = Number(args[flag + 1]);
  args.splice(flag, 2);
}
const input = args.join(" ").trim();

if (!input || !(maxStores >= 1)) {
  console.error('Употреба: npm run basket -- [--max-stores N] "млеко, 10 јајца, сирење"');
  console.error(`Познати производи: ${CATALOG.map((t) => t.aliases[0]).join(", ")}`);
  process.exit(1);
}

const den = (n: number) => `${n.toLocaleString("mk-MK")} ден.`;

function formatAmount(amount: number, unit: Unit): string {
  if (unit === "pc") return `${amount} парч.`;
  const [small, big] = unit === "kg" ? ["г", "кг"] : ["мл", "л"];
  return amount < 1 ? `${Math.round(amount * 1000)} ${small}` : `${Number(amount.toFixed(2))} ${big}`;
}

function printPlan(plan: Plan, showStore: boolean) {
  for (const { line, store, purchase } of plan.items) {
    const label = `${line.type.label} — ${formatAmount(line.need, line.type.unit)}`;
    if (!purchase || !store) {
      console.log(`    ✗ ${label}: нема`);
      continue;
    }
    const where = showStore ? ` @ ${store.label}` : "";
    const packs = purchase.divisible ? "на мерење" : `${purchase.packs} × ${den(purchase.offer.price)}`;
    const promo =
      purchase.offer.regularPrice && purchase.offer.price < purchase.offer.regularPrice
        ? ` (акција, редовно ${den(purchase.offer.regularPrice)})`
        : "";
    console.log(`    ${den(purchase.cost).padStart(10)}  ${label}${where}`);
    console.log(`                ${purchase.offer.name} · ${packs}${promo}`);
  }
}

const { date, snapshots } = await loadLatestSnapshots();
const { lines, unknown } = parseList(input);

if (lines.length === 0) {
  console.error(`Не препознав ниту еден производ. Познати: ${CATALOG.map((t) => t.aliases[0]).join(", ")}`);
  process.exit(1);
}

const { single, best } = compareBasket(snapshots, lines, maxStores);

console.log(`\nКошничка: ${lines.map((l) => `${l.type.label} (${formatAmount(l.need, l.type.unit)})`).join(", ")}`);
console.log(`Цени од ${date} · ${snapshots.map((s) => s.label).join(", ")}`);
if (unknown.length > 0) console.log(`Не препознав: ${unknown.join(", ")}`);

console.log("\n── Цела кошничка во една продавница ──");
for (const plan of single) {
  const store = plan.stores[0];
  const note = plan.missing.length > 0 ? `  (недостигаат ${plan.missing.length}: ${plan.missing.map((l) => l.type.aliases[0]).join(", ")})` : "";
  console.log(`\n  ${store ? store.label : "—"}: ${den(plan.total)}${note}`);
  printPlan(plan, false);
}

const complete = single.filter((p) => p.missing.length === 0);
console.log("\n── Заклучок ──");
if (complete.length > 0) {
  const [cheapest, priciest] = [complete[0], complete.at(-1)!];
  console.log(`  Најевтино на едно место: ${cheapest.stores[0].label} — ${den(cheapest.total)}`);
  if (complete.length > 1 && priciest.total > cheapest.total) {
    console.log(`  Заштеда наспроти најскапата (${priciest.stores[0].label}): ${den(priciest.total - cheapest.total)}`);
  }
} else {
  console.log("  Ниту една продавница ја нема целата кошничка.");
}

if (best.stores.length > 1) {
  const baseline = complete[0];
  const saving = baseline ? ` — уште ${den(baseline.total - best.total)} заштеда` : "";
  console.log(`\n  Со ${best.stores.length} продавници (${best.stores.map((s) => s.label).join(" + ")}): ${den(best.total)}${saving}`);
  printPlan(best, true);
} else if (maxStores > 1) {
  console.log("  Втора продавница не носи дополнителна заштеда.");
}
console.log();
