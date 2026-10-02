// Заеднички тест-пакет за секоја имплементација на PriceStore.
// Се повикува од price-store-file.test.ts, а подоцна и од Postgres тестот.

import assert from "node:assert/strict";
import { test } from "node:test";
import { recordFetch, type PriceStore } from "./price-store.ts";
import type { Offer, SnapshotFile } from "./types.ts";

const offer = (name: string, price: number): Offer => ({
  name, price, regularPrice: null, unitPriceText: "", category: "", description: "", promoUntil: null,
});

const snap = (storeId: string, offers: Offer[], completeness?: SnapshotFile["completeness"]): SnapshotFile => ({
  storeId, chain: "Т", label: storeId, city: "Велес", fetchedAt: "2026-10-02T08:00:00.000Z", updatedAt: null, offers, completeness,
});

export function priceStoreContract(name: string, makeStore: () => Promise<PriceStore>) {
  test(`${name}: снимка се чува и се чита назад`, async () => {
    const store = await makeStore();
    assert.equal(await store.latestSnapshot("a"), null);
    await store.saveSnapshot("2026-10-01", snap("a", [offer("МЛЕКО", 50)]));
    const got = await store.latestSnapshot("a");
    assert.equal(got?.date, "2026-10-01");
    assert.deepEqual(got?.snapshot.offers, [offer("МЛЕКО", 50)]);
  });

  test(`${name}: најнова снимка пред даден ден и по продавница`, async () => {
    const store = await makeStore();
    await store.saveSnapshot("2026-09-30", snap("a", [offer("X", 1)]));
    await store.saveSnapshot("2026-10-01", snap("a", [offer("X", 2)]));
    await store.saveSnapshot("2026-10-02", snap("a", [offer("X", 3)]));
    await store.saveSnapshot("2026-10-01", snap("b", [offer("Y", 9)]));

    assert.equal((await store.latestSnapshot("a"))?.date, "2026-10-02");
    assert.equal((await store.latestSnapshot("a", "2026-10-02"))?.date, "2026-10-01");
    assert.equal(await store.latestSnapshot("a", "2026-09-30"), null);

    const latest = (await store.latestSnapshots()).map((l) => [l.snapshot.storeId, l.date]).sort();
    assert.deepEqual(latest, [["a", "2026-10-02"], ["b", "2026-10-01"]]);
  });

  test(`${name}: промени наспроти претходниот ден; повторно во ист ден без дупликати`, async () => {
    const store = await makeStore();
    await recordFetch(store, "2026-10-01", snap("a", [offer("МЛЕКО", 50), offer("ЛЕБ", 35)]));
    const r1 = await recordFetch(store, "2026-10-02", snap("a", [offer("МЛЕКО", 44), offer("ЈАЈЦА", 75)]));
    assert.equal(r1.prevDate, "2026-10-01");
    assert.deepEqual(r1.changed.map((c) => [c.name, c.oldPrice, c.newPrice]), [["МЛЕКО", 50, 44]]);
    assert.deepEqual(r1.added.map((o) => o.name), ["ЈАЈЦА"]);
    assert.deepEqual(r1.removed.map((o) => o.name), ["ЛЕБ"]);

    // Второ преземање истиот ден: споредба пак со 01.10, записот се заменува.
    const r2 = await recordFetch(store, "2026-10-02", snap("a", [offer("МЛЕКО", 44), offer("ЈАЈЦА", 75), offer("ЛЕБ", 35)]));
    assert.equal(r2.prevDate, "2026-10-01");
    const recs = await store.changesBetween("2026-10-01", "2026-10-02");
    assert.deepEqual(recs.map((r) => [r.date, r.storeId]), [["2026-10-01", "a"], ["2026-10-02", "a"]]);
    assert.deepEqual(recs[1].removed, []);
  });

  test(`${name}: нецелосна снимка не создава „исчезнати"`, async () => {
    const store = await makeStore();
    await recordFetch(store, "2026-10-01", snap("z", [offer("A", 1), offer("B", 2), offer("C", 3)], { expected: 3, passes: 1 }));
    const r = await recordFetch(store, "2026-10-02", snap("z", [offer("A", 1), offer("C", 4)], { expected: 3, passes: 3 }));
    assert.deepEqual(r.removed, []);
    assert.deepEqual(r.changed.map((c) => c.name), ["C"]);
    assert.match(r.notes.join(" "), /нецелосна/);
  });

  test(`${name}: промени по период`, async () => {
    const store = await makeStore();
    await recordFetch(store, "2026-09-30", snap("a", [offer("X", 1)]));
    await recordFetch(store, "2026-10-01", snap("a", [offer("X", 2)]));
    await recordFetch(store, "2026-10-02", snap("a", [offer("X", 3)]));
    const recs = await store.changesBetween("2026-10-01", "2026-10-02");
    assert.deepEqual(recs.map((r) => r.date), ["2026-10-01", "2026-10-02"]);
  });
}
