// Ги презема ценовниците на сите продавници од регистарот и ги снима на диск.
// Употреба: npm run fetch            (сите продавници)
//           npm run fetch -- zito    (само продавници чиј id почнува со „zito")

import { runByHost } from "./fetch-plan.ts";
import { isStale } from "./freshness.ts";
import { REQUEST_DELAY_MS } from "./net.ts";
import { saveSnapshot } from "./snapshots.ts";
import { STORES } from "./stores.ts";

const filter = process.argv[2];
const stores = filter ? STORES.filter((s) => s.id.startsWith(filter)) : STORES;
if (stores.length === 0) {
  console.error(`Нема продавница со id што почнува со „${filter}". Достапни: ${STORES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const date = new Date().toLocaleDateString("sv-SE"); // локален датум како YYYY-MM-DD
const started = Date.now();
const secondsSince = (t: number) => ((Date.now() - t) / 1000).toFixed(0);

// Различни сервери паралелно; продавниците на ист сервер една по една, со пауза.
const results = await runByHost(
  stores,
  async (store) => {
    const t = Date.now();
    try {
      const { updatedAt, offers, completeness } = await store.fetchOffers();
      // Празен ценовник не смее да ги замени вчерашните цени со „ништо".
      if (offers.length === 0) throw new Error("празен ценовник");
      const fetchedAt = new Date().toISOString();
      await saveSnapshot(date, {
        storeId: store.id,
        chain: store.chain,
        label: store.label,
        city: store.city,
        fetchedAt,
        updatedAt,
        offers,
      });
      const stale = isStale({ updatedAt, fetchedAt }) ? " ЗАСТАРЕНО (маркетот не го ажурирал ценовникот над 2 дена)" : "";
      const passes = completeness
        ? `, ${completeness.passes} поминув.${offers.length < completeness.expected ? `, НЕДОСТИГААТ ${completeness.expected - offers.length} од ${completeness.expected}` : ""}`
        : "";
      console.log(`✓ ${store.label}: ${offers.length} производи (ажурирано: ${updatedAt ?? "непознато"}${passes}) — ${secondsSince(t)} сек${stale}`);
    } catch (err) {
      console.error(`✗ ${store.label}: ${err instanceof Error ? err.message : err} — ${secondsSince(t)} сек`);
      throw err;
    }
  },
  REQUEST_DELAY_MS,
);

const failed = results.filter((r) => r.error).length;
console.log(`\n${results.length - failed}/${results.length} продавници за ${secondsSince(started)} сек`);
if (failed > 0) process.exit(1);
