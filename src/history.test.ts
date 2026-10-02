import assert from "node:assert/strict";
import { test } from "node:test";
import type { PriceChange } from "./changes.ts";
import { priceOn, priceSeries } from "./history.ts";
import type { ChangesRecord } from "./price-store.ts";
import type { Offer } from "./types.ts";

function offer(name: string, price: number, extra: Partial<Offer> = {}): Offer {
  return { name, price, regularPrice: null, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null, ...extra };
}

function record(date: string, prevDate: string | null, diff: Partial<Pick<ChangesRecord, "added" | "removed" | "changed">>): ChangesRecord {
  return { storeId: "s", date, prevDate, added: [], removed: [], changed: [], notes: [], ...diff };
}

const change = (name: string, oldPrice: number, newPrice: number): PriceChange => ({ name, oldPrice, newPrice, offer: offer(name, newPrice) });

const X = "МЛЕКО 1Л";

test("серија: додаден → променет → исчезнат → повторно додаден со друга цена", () => {
  const changes = [
    record("2026-01-01", null, { added: [offer(X, 100)] }),
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
