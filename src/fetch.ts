// Ги презема ценовниците на сите продавници од регистарот и ги снима на диск.
// Употреба: npm run fetch            (сите продавници)
//           npm run fetch -- zito    (само продавници чиј id почнува со „zito")

import { saveSnapshot } from "./snapshots.ts";
import { STORES } from "./stores.ts";

const filter = process.argv[2];
const stores = filter ? STORES.filter((s) => s.id.startsWith(filter)) : STORES;
if (stores.length === 0) {
  console.error(`Нема продавница со id што почнува со „${filter}". Достапни: ${STORES.map((s) => s.id).join(", ")}`);
  process.exit(1);
}

const date = new Date().toLocaleDateString("sv-SE"); // локален датум како YYYY-MM-DD
let failed = 0;

// Продавниците се на различни сервери, па ги преземаме паралелно;
// барањата кон ист сервер остануваат последователни со пауза.
await Promise.all(
  stores.map(async (store) => {
    const started = Date.now();
    try {
      const { updatedAt, offers } = await store.fetchOffers();
      await saveSnapshot(date, {
        storeId: store.id,
        chain: store.chain,
        label: store.label,
        city: store.city,
        fetchedAt: new Date().toISOString(),
        updatedAt,
        offers,
      });
      const secs = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`✓ ${store.label}: ${offers.length} производи (ажурирано: ${updatedAt ?? "непознато"}) — ${secs} сек`);
    } catch (err) {
      failed++;
      console.error(`✗ ${store.label}: ${err instanceof Error ? err.message : err}`);
    }
  }),
);

if (failed > 0) process.exit(1);
