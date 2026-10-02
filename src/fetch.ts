// Ги презема ценовниците на сите продавници од регистарот и ги снима на диск.
// Употреба: npm run fetch            (сите продавници)
//           npm run fetch -- zito    (само продавници чиј id почнува со „zito")

import { runByHost } from "./fetch-plan.ts";
import { isStale } from "./freshness.ts";
import { addDays } from "./history.ts";
import { REQUEST_DELAY_MS } from "./net.ts";
import { recordFetch } from "./price-store.ts";
import { createFilePriceStore } from "./price-store-file.ts";
import { STORES } from "./stores.ts";

const filter = process.argv[2];
const stores = filter ? STORES.filter((s) => s.id.startsWith(filter)) : STORES;
if (stores.length === 0) {
  console.error(`Нема продавница со id што почнува со „${filter}". Достапни: ${STORES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const date = new Date().toLocaleDateString("sv-SE"); // локален датум како YYYY-MM-DD

/** Рок на чување (SPEC-price-history.md): промени една година, целосни снимки една недела. */
const KEEP_CHANGES_DAYS = 365;
const KEEP_SNAPSHOTS_DAYS = 7;
const priceStore = createFilePriceStore();
const started = Date.now();
const secondsSince = (t: number) => ((Date.now() - t) / 1000).toFixed(0);

// Различни сервери паралелно; продавниците на ист сервер една по една, со пауза.
const results = await runByHost(
  stores,
  async (store) => {
    const t = Date.now();
    try {
      const { updatedAt, offers, completeness } = await store.fetchOffers();
      const fetchedAt = new Date().toISOString();
      const changes = await recordFetch(priceStore, date, {
        storeId: store.id,
        chain: store.chain,
        label: store.label,
        city: store.city,
        fetchedAt,
        updatedAt,
        offers,
        completeness,
      });
      const stale = isStale({ updatedAt, fetchedAt }) ? " ЗАСТАРЕНО (маркетот не го ажурирал ценовникот над 2 дена)" : "";
      const passes = completeness
        ? `, ${completeness.passes} поминув.${offers.length < completeness.expected ? `, НЕДОСТИГААТ ${completeness.expected - offers.length} од ${completeness.expected}` : ""}`
        : "";
      console.log(`✓ ${store.label}: ${offers.length} производи (ажурирано: ${updatedAt ?? "непознато"}${passes}) — ${secondsSince(t)} сек${stale}`);
      const since = changes.prevDate ? `од ${changes.prevDate}` : "прва снимка";
      const notes = changes.notes.length ? ` (${changes.notes.join("; ")})` : "";
      console.log(`    промени ${since}: ${changes.changed.length} цени, ${changes.added.length} нови, ${changes.removed.length} исчезнати${notes}`);
    } catch (err) {
      console.error(`✗ ${store.label}: ${err instanceof Error ? err.message : err} — ${secondsSince(t)} сек`);
      throw err;
    }
  },
  REQUEST_DELAY_MS,
);

const failed = results.filter((r) => r.error).length;
console.log(`\n${results.length - failed}/${results.length} продавници за ${secondsSince(started)} сек`);
// По успешно преземање: старото надвор од рокот. Најновата снимка на секоја продавница
// (и на онаа што денес паднала) останува секогаш.
if (failed < results.length) {
  const changes = await priceStore.pruneChanges(addDays(date, -KEEP_CHANGES_DAYS));
  const snapshots = await priceStore.pruneSnapshots(addDays(date, -KEEP_SNAPSHOTS_DAYS));
  if (changes || snapshots) console.log(`Избришано надвор од рокот: ${snapshots} снимки, ${changes} записи со промени`);
}
if (failed > 0) process.exit(1);
