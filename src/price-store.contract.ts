// Заеднички тест-пакет за секоја имплементација на PriceStore.
// Се повикува од price-store-file.test.ts, а подоцна и од Postgres тестот.

import assert from "node:assert/strict";
import { test } from "node:test";
import { loadCurrentSnapshots, recordFetch, type PriceStore } from "./price-store.ts";
import type { Offer, SnapshotFile } from "./types.ts";

const offer = (name: string, price: number): Offer => ({
  name, price, regularPrice: null, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null,
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
    // Како Жито: 19 од 20 објавени — еден производ случајно не стигнал.
    const all = Array.from({ length: 20 }, (_, i) => offer(`P${i}`, 10));
    await recordFetch(store, "2026-10-01", snap("z", all, { expected: 20, passes: 1 }));
    // P0 не стигнал, P19 поскапел.
    const next = [...all.slice(1, 19), offer("P19", 12)];
    const r = await recordFetch(store, "2026-10-02", snap("z", next, { expected: 20, passes: 3 }));
    assert.deepEqual(r.removed, []);
    assert.deepEqual(r.changed.map((c) => c.name), ["P19"]);
    assert.match(r.notes.join(" "), /нецелосна/);
  });

  test(`${name}: непознат број на производи значи нецелосна снимка`, async () => {
    const store = await makeStore();
    await recordFetch(store, "2026-10-01", snap("z", [offer("A", 1), offer("B", 2)], { expected: 0, passes: 3 }));
    const r = await recordFetch(store, "2026-10-02", snap("z", [offer("A", 1), offer("C", 3)], { expected: 0, passes: 3 }));
    assert.deepEqual(r.removed, []);
  });

  test(`${name}: празен или скратен ценовник не ја заменува претходната снимка`, async () => {
    const store = await makeStore();
    const full = Array.from({ length: 100 }, (_, i) => offer(`P${i}`, i + 1));
    await recordFetch(store, "2026-10-01", snap("a", full));

    await assert.rejects(recordFetch(store, "2026-10-02", snap("a", [])), /празен/);
    // Под 70% од претходната снимка (кога изворот не објавува вкупен број).
    await assert.rejects(recordFetch(store, "2026-10-02", snap("a", full.slice(0, 60))), /скратен/);
    // Под 90% од бројот што го објавува изворот.
    await assert.rejects(
      recordFetch(store, "2026-10-02", snap("a", full.slice(0, 85), { expected: 100, passes: 3 })),
      /скратен/,
    );
    assert.equal((await store.latestSnapshot("a"))?.date, "2026-10-01");
    assert.deepEqual(await store.changesBetween("2026-10-02", "2026-10-02"), []);

    // Повторно преземање во ист ден што е скратено не ја брише добрата снимка од тој ден.
    await recordFetch(store, "2026-10-02", snap("a", full));
    await assert.rejects(recordFetch(store, "2026-10-02", snap("a", full.slice(0, 50))), /скратен/);
    assert.equal((await store.latestSnapshot("a"))?.snapshot.offers.length, 100);

    // Нормално намалување (95 од 100) е во ред.
    await recordFetch(store, "2026-10-03", snap("a", full.slice(0, 95)));
  });

  test(`${name}: тековни снимки само за продавниците од регистарот`, async () => {
    const store = await makeStore();
    await store.saveSnapshot("2026-10-01", snap("a", [offer("X", 1)]));
    await store.saveSnapshot("2026-10-02", snap("b", [offer("Y", 2)]));
    await store.saveSnapshot("2026-10-02", snap("стара", [offer("Z", 3)]));

    const { snapshots, dates } = await loadCurrentSnapshots(store, new Set(["a", "b"]));
    assert.deepEqual(snapshots.map((s) => s.storeId).sort(), ["a", "b"]);
    assert.deepEqual(dates, ["2026-10-01", "2026-10-02"]);
    await assert.rejects(loadCurrentSnapshots(store, new Set(["нема"])), /npm run fetch/);
  });

  test(`${name}: промени по период`, async () => {
    const store = await makeStore();
    await recordFetch(store, "2026-09-30", snap("a", [offer("X", 1)]));
    await recordFetch(store, "2026-10-01", snap("a", [offer("X", 2)]));
    await recordFetch(store, "2026-10-02", snap("a", [offer("X", 3)]));
    const recs = await store.changesBetween("2026-10-01", "2026-10-02");
    assert.deepEqual(recs.map((r) => r.date), ["2026-10-01", "2026-10-02"]);
  });

  test(`${name}: бришење на стари промени — само постарите од рокот`, async () => {
    const store = await makeStore();
    for (const [date, price] of [["2026-09-28", 1], ["2026-09-29", 2], ["2026-09-30", 3], ["2026-10-01", 4]] as const) {
      await recordFetch(store, date, snap("a", [offer("X", price)]));
    }
    assert.equal(await store.pruneChanges("2026-09-30"), 2);
    const left = await store.changesBetween("2000-01-01", "2100-01-01");
    assert.deepEqual(left.map((r) => r.date), ["2026-09-30", "2026-10-01"]);
    assert.equal(await store.pruneChanges("2026-09-30"), 0);
  });

  test(`${name}: бришење на стари снимки — најновата на секоја продавница останува`, async () => {
    const store = await makeStore();
    await store.saveSnapshot("2026-09-01", snap("a", [offer("X", 1)]));
    await store.saveSnapshot("2026-09-02", snap("a", [offer("X", 2)]));
    await store.saveSnapshot("2026-10-01", snap("a", [offer("X", 3)]));
    // Продавница „b" не е преземена од 02.09: нејзината единствена снимка мора да остане.
    await store.saveSnapshot("2026-09-02", snap("b", [offer("Y", 5)]));

    assert.equal(await store.pruneSnapshots("2026-09-25"), 2);
    assert.equal((await store.latestSnapshot("a"))?.date, "2026-10-01");
    assert.equal((await store.latestSnapshot("a", "2026-10-01")), null);
    assert.equal((await store.latestSnapshot("b"))?.snapshot.offers[0].price, 5);
    assert.equal(await store.pruneSnapshots("2026-09-25"), 0);
  });
}
