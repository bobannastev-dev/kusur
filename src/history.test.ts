import assert from "node:assert/strict";
import { test } from "node:test";
import type { PriceChange } from "./changes.ts";
import { CATALOG } from "./catalog.ts";
import { dropsSince, priceOn, priceSeries, promoCheck, type PricePoint, type StoreHistory } from "./history.ts";
import type { ChangesRecord } from "./price-store.ts";
import type { TypeMaps } from "./type-maps.ts";
import type { Offer, SnapshotFile } from "./types.ts";

function offer(name: string, price: number, extra: Partial<Offer> = {}): Offer {
  return { name, price, regularPrice: null, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null, ...extra };
}

function record(
  date: string,
  prevDate: string | null,
  diff: Partial<Pick<ChangesRecord, "added" | "removed" | "changed" | "addedMayReturn">>,
): ChangesRecord {
  // Како recordFetch: „новите" се сигурни само ако има (целосна) претходна снимка.
  return { storeId: "s", date, prevDate, added: [], removed: [], changed: [], notes: [], addedMayReturn: prevDate === null, ...diff };
}

const change = (name: string, oldPrice: number, newPrice: number): PriceChange => ({ name, oldPrice, newPrice, offer: offer(name, newPrice) });

const X = "МЛЕКО 1Л";

test("серија: додаден → променет → исчезнат → повторно додаден со друга цена", () => {
  const changes = [
    record("2026-01-01", "2025-12-31", { added: [offer(X, 100)] }),
    record("2026-01-05", "2026-01-04", { changed: [change(X, 100, 90)] }),
    record("2026-01-08", "2026-01-07", { removed: [offer(X, 90)] }),
    record("2026-01-12", "2026-01-11", { added: [offer(X, 95)] }),
  ];
  const series = priceSeries(changes, { date: "2026-01-20", offer: offer(X, 95) }, X);
  assert.equal(priceOn(series, "2026-01-01"), 100);
  assert.equal(priceOn(series, "2026-01-04"), 100);
  assert.equal(priceOn(series, "2026-01-05"), 90);
  assert.equal(priceOn(series, "2026-01-07"), 90);
  assert.equal(priceOn(series, "2026-01-10"), null); // го немало
  assert.equal(priceOn(series, "2026-01-12"), 95);
  assert.equal(priceOn(series, "2026-01-20"), 95);
  // Пред да биде додаден, го немало.
  assert.equal(priceOn(series, "2025-12-31"), null);
});

test("серија: производ што Жито го испуштил во нецелосна снимка не е нов кога ќе се врати", () => {
  // 01: X постои (без промена); 03: нецелосна снимка, X не стигнал (не е запишан како исчезнат);
  // 04: X се враќа како „нов", но претходната снимка беше нецелосна.
  const changes = [
    record("2026-01-03", "2026-01-02", { addedMayReturn: false }),
    record("2026-01-04", "2026-01-03", { added: [offer(X, 50)], addedMayReturn: true }),
  ];
  const series = priceSeries(changes, { date: "2026-01-10", offer: offer(X, 50) }, X);
  assert.equal(priceOn(series, "2026-01-01"), 50);
});

test("серија: прв ден на продавница — пред него не значи дека го немало", () => {
  const changes = [record("2026-01-01", null, { added: [offer(X, 80)] })];
  const series = priceSeries(changes, { date: "2026-01-10", offer: offer(X, 80) }, X);
  assert.equal(series[0].added, false);
  // Стари записи без ознака: првиот ден исто така не значи „нов".
  const { addedMayReturn: _, ...old } = changes[0];
  assert.equal(priceSeries([old], { date: "2026-01-10", offer: offer(X, 80) }, X)[0].added, false);
});

test("серија: цена за споредба без клуб-картичка, и за старата цена", () => {
  const club = offer(X, 45, { regularPrice: 55, promoKind: "ЛОЈАЛНОСТ" });
  const c = { ...change(X, 45, 50), oldOffer: club };
  const series = priceSeries([record("2026-01-05", "2026-01-04", { changed: [c] })], { date: "2026-01-05", offer: offer(X, 50) }, X);
  assert.deepEqual([priceOn(series, "2026-01-04"), priceOn(series, "2026-01-04", "comparable")], [45, 55]);
});

test("серија: производ без промени ја има тековната цена секој ден", () => {
  const changes = [record("2026-01-05", "2026-01-04", { changed: [change("ДРУГ", 10, 9)] })];
  const series = priceSeries(changes, { date: "2026-01-20", offer: offer(X, 70) }, X);
  assert.equal(priceOn(series, "2026-01-01"), 70);
  assert.equal(priceOn(series, "2026-01-20"), 70);
});

test("серија: цената пред првата промена е старата цена од таа промена", () => {
  const changes = [record("2026-01-05", "2026-01-04", { changed: [change(X, 100, 80)] })];
  const series = priceSeries(changes, { date: "2026-01-05", offer: offer(X, 80) }, X);
  assert.equal(priceOn(series, "2026-01-01"), 100);
  assert.equal(priceOn(series, "2026-01-05"), 80);
});

test("серија: производ што исчезнал и не се вратил", () => {
  const changes = [record("2026-01-05", "2026-01-04", { removed: [offer(X, 60)] })];
  const series = priceSeries(changes, { date: "2026-01-20", offer: undefined }, X);
  assert.equal(priceOn(series, "2026-01-02"), 60);
  assert.equal(priceOn(series, "2026-01-05"), null);
  assert.equal(priceOn(series, "2026-01-20"), null);
});

// ── Поевтинето од датум ──

const mleko = CATALOG.find((t) => t.id === "mleko")!;
const MAPS: TypeMaps = { products: {}, categories: { Ж: { "МЛЕКО": ["mleko"] } } };
const milk = (name: string, price: number, extra: Partial<Offer> = {}) => offer(name, price, { category: "МЛЕКО", ...extra });

function history(date: string, offers: Offer[], changes: ChangesRecord[]): StoreHistory {
  const snapshot: SnapshotFile = { storeId: "s", chain: "Ж", label: "Ж", city: "Велес", fetchedAt: "", updatedAt: null, offers };
  return { date, snapshot, changes };
}

test("поевтинето: 5% е поевтинување, 4% не е", () => {
  const h = history("2026-01-10", [milk("МЛЕКО А 1Л", 95), milk("МЛЕКО Б 1Л", 96)], [
    record("2026-01-05", "2026-01-04", { changed: [change("МЛЕКО А 1Л", 100, 95), change("МЛЕКО Б 1Л", 100, 96)] }),
  ]);
  const [result] = dropsSince([h], [mleko], "2026-01-01", MAPS);
  assert.deepEqual(result.drops.map((d) => [d.offer.name, d.oldPrice, d.newPrice]), [["МЛЕКО А 1Л", 100, 95]]);
});

test("поевтинето: клуб-цената не е поевтинување", () => {
  const h = history("2026-01-10", [milk("МЛЕКО 1Л", 45, { regularPrice: 55, promoKind: "ЛОЈАЛНОСТ" })], [
    record("2026-01-05", "2026-01-04", { changed: [change("МЛЕКО 1Л", 55, 45)] }),
  ]);
  assert.deepEqual(dropsSince([h], [mleko], "2026-01-01", MAPS)[0].drops, []);
});

test("поевтинето: нов производ не е поевтинување; најевтино по литар е", () => {
  const h = history("2026-01-10", [milk("МЛЕКО 1Л", 60), milk("МЛЕКО 2Л", 100)], [
    record("2026-01-05", "2026-01-04", { added: [milk("МЛЕКО 2Л", 100)] }),
  ]);
  const [result] = dropsSince([h], [mleko], "2026-01-01", MAPS);
  assert.deepEqual(result.drops, []);
  assert.deepEqual([result.cheapest.then?.unitPrice, result.cheapest.now?.unitPrice, result.cheapest.dropped], [60, 50, true]);
  assert.equal(result.cheapest.now?.offer.name, "МЛЕКО 2Л");
});

test("поевтинето: најевтиното тогаш го брои и производот што потоа исчезнал", () => {
  // Тогаш: 1Л за 50 (потоа исчезнат) и 1Л за 60. Денес само 60 → нема поевтинување.
  const h = history("2026-01-10", [milk("МЛЕКО Б 1Л", 60)], [
    record("2026-01-05", "2026-01-04", { removed: [milk("МЛЕКО А 1Л", 50)] }),
  ]);
  const [result] = dropsSince([h], [mleko], "2026-01-01", MAPS);
  assert.deepEqual([result.cheapest.then?.unitPrice, result.cheapest.now?.unitPrice, result.cheapest.dropped], [50, 60, false]);
});

test("поевтинето: датум пред почетокот на историјата → првиот достапен ден", () => {
  const h = history("2026-01-10", [milk("МЛЕКО 1Л", 90)], [
    record("2026-01-05", "2026-01-04", { changed: [change("МЛЕКО 1Л", 100, 90)] }),
  ]);
  const [result] = dropsSince([h], [mleko], "2025-06-01", MAPS);
  assert.deepEqual([result.since, result.sinceAdjusted, result.drops.length], ["2026-01-04", true, 1]);
});

// ── Вистинска акција ──

/** Серија од парови [ден од 2026-01-01, цена]: цената важи од тој ден. */
const days = (...pairs: [number, number][]): PricePoint[] =>
  pairs.map(([day, price]) => ({ date: new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10), price }));
const DAY_40 = "2026-02-10"; // ден 40
const START = "2026-01-01";

test("акција: вистинска — пониска од најниската во 30-те дена пред неа", () => {
  const series = days([0, 100], [40, 80]);
  const r = promoCheck(milk("М", 80, { regularPrice: 100 }), series, START);
  assert.deepEqual([r.verdict, r.promoStart, r.lowestBefore, r.loyalty], ["genuine", DAY_40, 100, false]);
});

test("акција: не е пониска — пред две недели чинело исто", () => {
  const series = days([0, 80], [26, 100], [40, 80]);
  const r = promoCheck(milk("М", 80, { regularPrice: 100 }), series, START);
  assert.deepEqual([r.verdict, r.lowestBefore], ["not-lower", 80]);
});

test("акција: редовната цена е кренана пред попустот", () => {
  const series = days([0, 100], [35, 120], [40, 95]);
  const r = promoCheck(milk("М", 95, { regularPrice: 120 }), series, START);
  assert.deepEqual([r.verdict, r.lowestBefore], ["regular-raised", 100]);
});

test("акција: нема доволно историја (10 дена пред акцијата)", () => {
  const series = days([30, 100], [40, 80]);
  const r = promoCheck(milk("М", 80, { regularPrice: 100 }), series, "2026-01-31");
  assert.equal(r.verdict, "insufficient");
});

test("акција: клуб-цената носи ознака; производ без акција не се проверува", () => {
  const series = days([0, 55], [40, 45]);
  const club = promoCheck(milk("М", 45, { regularPrice: 55, promoKind: "ЛОЈАЛНОСТ" }), series, START);
  assert.deepEqual([club.verdict, club.loyalty], ["genuine", true]);
  assert.equal(promoCheck(milk("М", 55), days([0, 55]), START).verdict, "not-on-promo");
});

test("акција: иста акциска цена уште од почетокот на историјата", () => {
  // Првиот ден на продавницата производот е „додаден" (без претходна снимка), потоа без промени.
  const offerOnPromo = milk("М", 80, { regularPrice: 100 });
  const seriesFrom = (first: string) =>
    priceSeries([record(first, null, { added: [offerOnPromo] })], { date: "2026-02-10", offer: offerOnPromo }, "М");
  const longHistory = promoCheck(offerOnPromo, seriesFrom(START), START);
  assert.deepEqual([longHistory.verdict, longHistory.promoStart, longHistory.lowestBefore], ["not-lower", START, 80]);
  assert.equal(promoCheck(offerOnPromo, seriesFrom("2026-02-01"), "2026-02-01").verdict, "insufficient");
});

test("акција: граници на 30-те дена — ден −30 се брои, ден −31 не", () => {
  const promo = milk("М", 80, { regularPrice: 100 });
  // Акција од ден 40; пониска цена (70) само на ден 10 (= −30) или ден 9 (= −31).
  const at30 = promoCheck(promo, days([0, 100], [10, 70], [11, 100], [40, 80]), START);
  assert.deepEqual([at30.verdict, at30.lowestBefore], ["not-lower", 70]);
  const at31 = promoCheck(promo, days([0, 100], [9, 70], [10, 100], [40, 80]), START);
  assert.deepEqual([at31.verdict, at31.lowestBefore], ["genuine", 100]);
});
