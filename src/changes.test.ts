import assert from "node:assert/strict";
import { test } from "node:test";
import { diffOffers } from "./changes.ts";
import type { Offer } from "./types.ts";

const offer = (name: string, price: number, regularPrice: number | null = null): Offer => ({
  name, price, regularPrice, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null,
});

test("нови, исчезнати и променети цени", () => {
  const prev = [offer("МЛЕКО 1Л", 50), offer("ЛЕБ 500Г", 35), offer("ШЕЌЕР 1КГ", 45)];
  const next = [offer("МЛЕКО 1Л", 44, 50), offer("ШЕЌЕР 1КГ", 45), offer("ЈАЈЦА 10/1", 75)];

  const diff = diffOffers(prev, next);
  assert.deepEqual(diff.added.map((o) => o.name), ["ЈАЈЦА 10/1"]);
  assert.deepEqual(diff.removed.map((o) => o.name), ["ЛЕБ 500Г"]);
  assert.deepEqual(diff.changed.map((c) => [c.name, c.oldPrice, c.newPrice]), [["МЛЕКО 1Л", 50, 44]]);
  assert.deepEqual(diff.duplicates, []);
});

test("иста снимка двапати нема промени", () => {
  const offers = [offer("МЛЕКО 1Л", 50), offer("ЛЕБ 500Г", 35)];
  const diff = diffOffers(offers, structuredClone(offers));
  assert.deepEqual([diff.added, diff.removed, diff.changed], [[], [], []]);
});

test("промена само на редовната цена или опис не е промена на цената", () => {
  const diff = diffOffers([offer("МЛЕКО 1Л", 50, 50)], [{ ...offer("МЛЕКО 1Л", 50, 55), description: "нов опис" }]);
  assert.deepEqual(diff.changed, []);
});

test("дупли имиња: се зема првото, се пријавува", () => {
  const next = [offer("СОЛ 1КГ", 14), offer("СОЛ 1КГ", 20), offer("ЛЕБ", 35)];
  const diff = diffOffers([offer("СОЛ 1КГ", 14)], next);
  assert.deepEqual(diff.changed, []); // 14 → 14 според првиот ред
  assert.deepEqual(diff.added.map((o) => o.name), ["ЛЕБ"]);
  assert.deepEqual(diff.duplicates, ["СОЛ 1КГ"]);
});

test("без претходна снимка: сè е ново", () => {
  const diff = diffOffers(null, [offer("МЛЕКО 1Л", 50)]);
  assert.deepEqual(diff.added.map((o) => o.name), ["МЛЕКО 1Л"]);
  assert.deepEqual([diff.removed, diff.changed], [[], []]);
});
