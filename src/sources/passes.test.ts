import assert from "node:assert/strict";
import { test } from "node:test";
import type { Offer } from "../types.ts";
import { collectUntilComplete } from "./passes.ts";

const o = (name: string, price = 10): Offer => ({
  name, price, regularPrice: null, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null,
});

/** Поминувања што секој пат враќаат дел од производите (како Жито). */
function fakePasses(results: string[][], total: number) {
  let i = 0;
  return async () => ({ offers: results[Math.min(i++, results.length - 1)].map((n) => o(n)), total, updatedAt: "01/10/2026 21:21" });
}

test("едно поминување е доволно кога сите производи се различни", async () => {
  const r = await collectUntilComplete(fakePasses([["A", "B", "C"]], 3), 3);
  assert.deepEqual([r.passes, r.offers.map((x) => x.name), r.expected], [1, ["A", "B", "C"], 3]);
});

test("се спојуваат поминувања додека не се соберат сите", async () => {
  // Секое поминување има дупликат и го губи еден производ.
  const r = await collectUntilComplete(fakePasses([["A", "B", "B"], ["A", "C", "C"]], 3), 3);
  assert.equal(r.passes, 2);
  assert.deepEqual(r.offers.map((x) => x.name).sort(), ["A", "B", "C"]);
});

test("запира по најмногу N поминувања и кажува колку недостигаат", async () => {
  const r = await collectUntilComplete(fakePasses([["A", "A"], ["A", "B"], ["A", "B"], ["A", "B", "C"]], 4), 3);
  assert.equal(r.passes, 3);
  assert.deepEqual([r.offers.length, r.expected], [2, 4]);
});

test("поминување што не донело ништо ново по второто го запира собирањето", async () => {
  const r = await collectUntilComplete(fakePasses([["A", "A"], ["A", "B"], ["A", "B"]], 5), 5);
  assert.equal(r.passes, 3); // 1: A, 2: +B, 3: ништо ново → стоп пред 4-то
  const r2 = await collectUntilComplete(fakePasses([["A", "A"], ["A", "A"]], 5), 5);
  assert.equal(r2.passes, 2);
});

test("ценовникот е од првото поминување, новите редови се додаваат по редослед", async () => {
  let n = 0;
  const run = async () => (n++ === 0
    ? { offers: [o("A", 10), o("B", 20), o("B", 20)], total: 3, updatedAt: "x" }
    : { offers: [o("A", 99), o("C", 30), o("C", 30)], total: 3, updatedAt: "y" });
  const r = await collectUntilComplete(run, 3);
  assert.deepEqual(r.offers.map((x) => [x.name, x.price]), [["A", 10], ["B", 20], ["C", 30]]);
  assert.equal(r.updatedAt, "x");
});

test("непознат број на производи (0): секогаш сите поминувања", async () => {
  // Ако „од N артикли" не се прочита, бројот е 0 — тоа е „непознато", не „сè е собрано".
  const r = await collectUntilComplete(fakePasses([["A"], ["A", "B"], ["A", "B", "C"]], 0), 3);
  assert.equal(r.passes, 3);
  assert.deepEqual(r.offers.map((x) => x.name), ["A", "B", "C"]);
  assert.equal(r.expected, 0);
});
