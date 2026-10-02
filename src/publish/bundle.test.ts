// Пакетот за телефонот мора да дава исти резултати како целосните податоци.

import assert from "node:assert/strict";
import { test } from "node:test";
import { compareBasket, compareBasketWith } from "../basket.ts";
import { CATALOG } from "../catalog.ts";
import type { PriceChange } from "../changes.ts";
import { allSeries, dropsFrom, dropsSince, historyStart, promoCheck, type StoreHistory } from "../history.ts";
import { parseList } from "../list.ts";
import type { ChangesRecord } from "../price-store.ts";
import type { TypeMaps } from "../type-maps.ts";
import type { Offer, SnapshotFile } from "../types.ts";
import { buildBundle } from "./build.ts";
import { fromBundle } from "./bundle.ts";

const offer = (name: string, price: number, category: string, extra: Partial<Offer> = {}): Offer => ({
  name, price, regularPrice: null, unitPriceText: "", category, description: "", promoKind: null, promoUntil: null, ...extra,
});
const change = (o: Offer, oldPrice: number): PriceChange => ({ name: o.name, oldPrice, newPrice: o.price, offer: o });
const rec = (storeId: string, date: string, prevDate: string, diff: Partial<ChangesRecord>): ChangesRecord => ({
  storeId, date, prevDate, added: [], removed: [], changed: [], notes: [], addedMayReturn: false, ...diff,
});

function store(id: string, chain: string, date: string, offers: Offer[], changes: ChangesRecord[]): StoreHistory {
  const snapshot: SnapshotFile = { storeId: id, chain, label: id, city: "Велес", fetchedAt: `${date}T08:00:00.000Z`, updatedAt: null, offers };
  return { date, snapshot, changes };
}

const MAPS: TypeMaps = {
  products: {},
  categories: {
    А: { "МЛЕКО": ["mleko"], "ЈАЈЦА": ["jajca"], "СИРЕЊЕ": ["sirenje"] },
    Б: { "Млеко": ["mleko"], "Јајца": ["jajca"] },
  },
};

const milkA = offer("МЛЕКО 1Л", 50, "МЛЕКО");
const milkA2 = offer("МЛЕКО 2Л", 90, "МЛЕКО", { regularPrice: 110, promoKind: "ЛОЈАЛНОСТ" });
const histories = [
  store("a", "А", "2026-01-10", [milkA, milkA2, offer("ЈАЈЦА М 10/1", 80, "ЈАЈЦА"), offer("СИРЕЊЕ КРАВЈО КГ", 400, "СИРЕЊЕ")], [
    rec("a", "2026-01-05", "2026-01-04", { changed: [change(milkA, 60)], removed: [offer("МЛЕКО СТАРО 1Л", 40, "МЛЕКО")] }),
  ]),
  store("b", "Б", "2026-01-10", [offer("МЛЕКО 1л", 55, "Млеко"), offer("ЈАЈЦА Л 10/1", 70, "Јајца")], [
    rec("b", "2026-01-03", "2026-01-02", { added: [offer("ЈАЈЦА Л 10/1", 70, "Јајца")] }),
  ]),
];
const types = CATALOG.filter((t) => ["mleko", "jajca", "sirenje"].includes(t.id));
const bundle = buildBundle(histories, types, MAPS, "2026-01-10");
const view = fromBundle(JSON.parse(JSON.stringify(bundle)));

test("пакет: кошничката е иста како од целосните снимки", () => {
  const { lines } = parseList("млеко, 10 јајца, сирење");
  const full = compareBasket(histories.map((h) => h.snapshot), lines, 2, MAPS);
  const fromPhone = compareBasketWith(view.stores, lines, 2, view.candidatesFor);
  const summary = (c: typeof full) => ({
    single: c.single.map((p) => [p.stores.map((s) => s.storeId), p.total, p.missing.length]),
    best: [c.best.stores.map((s) => s.storeId), c.best.total],
    items: c.best.items.map((i) => [i.purchase?.offer.name, i.purchase?.cost, i.purchase?.loyaltyPrice]),
  });
  assert.deepEqual(summary(fromPhone), summary(full));
});

test("пакет: поевтинето е исто како од целосната историја", () => {
  const full = dropsSince(histories, types, "2026-01-01", MAPS);
  const fromPhone = dropsFrom(view.prepared, types, "2026-01-01");
  const summary = (r: typeof full) =>
    r.map((t) => ({
      type: t.type.id, since: t.since, adjusted: t.sinceAdjusted,
      drops: t.drops.map((d) => [d.store.storeId, d.offer.name, d.oldPrice, d.newPrice]),
      cheapest: [t.cheapest.then?.unitPrice, t.cheapest.now?.unitPrice, t.cheapest.dropped],
    }));
  assert.deepEqual(summary(fromPhone), summary(full));
  // Исчезнатиот производ (40 ден./л) е „најевтино тогаш" и во пакетот.
  assert.equal(fromPhone.find((t) => t.type.id === "mleko")!.cheapest.then?.unitPrice, 40);
});

test("пакет: историјата и вистинската акција се исти", () => {
  const h = histories[0];
  const series = allSeries(h.changes, { date: h.date, offers: h.snapshot.offers });
  for (const name of ["МЛЕКО 1Л", "МЛЕКО 2Л"]) {
    assert.deepEqual(view.seriesOf("a", name), series.get(name));
  }
  assert.equal(view.start("a"), historyStart(h));
  const full = promoCheck(milkA2, series.get("МЛЕКО 2Л")!, historyStart(h));
  assert.deepEqual(promoCheck(milkA2, view.seriesOf("a", "МЛЕКО 2Л"), view.start("a")), full);
});

test("пакет: исчезнат производ не е за купување денес", () => {
  const milk = types.find((t) => t.id === "mleko")!;
  const a = view.stores.find((s) => s.storeId === "a")!;
  assert.deepEqual(view.candidatesFor(a, milk).map((c) => c.offer.name).sort(), ["МЛЕКО 1Л", "МЛЕКО 2Л"]);
});
