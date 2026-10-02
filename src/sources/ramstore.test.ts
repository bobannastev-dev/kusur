// Фикстура: вистинска страница на Рамстор Велес од 2026-10-01, скратена на 15 реда.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseRamstorePage } from "./ramstore.ts";

const html = readFileSync(new URL("./fixtures/ramstore-veles.html", import.meta.url), "utf8");

test("Рамстор: редови и датум на ажурирање", () => {
  const { updatedAt, offers } = parseRamstorePage(html);
  assert.equal(updatedAt, "01.10.2026 4:00AM");
  assert.equal(offers.length, 15);
  // Без акција Рамстор не ја пополнува редовната цена.
  assert.deepEqual(offers[0], {
    name: "СОНЧЕВА ДОЛИНА ОРИЗ 900 ГР",
    price: 145,
    regularPrice: null,
    unitPriceText: "100 ГР: =16.11ДЕН",
    category: "ОРИЗ",
    description: "",
    promoKind: null,
    promoUntil: null,
  });
});

test("Рамстор: ред со акција", () => {
  const { offers } = parseRamstorePage(html);
  const rizo = offers.find((o) => o.name === "РИСО СКОТИ ОРИЗ ПАРБОИЛД 1 КГ")!;
  assert.deepEqual(
    [rizo.price, rizo.regularPrice, rizo.promoKind, rizo.promoUntil],
    [179, 255, "АКЦИСКА ПРОДАЖБА", "01.10.2026 - 21.10.2026"],
  );
});

test("Рамстор: клуб-цена (ЛОЈАЛНОСТ): продажната е со картичка, редовната без", () => {
  const { offers } = parseRamstorePage(html);
  const benlian = offers.find((o) => o.name === "БЕНЛИАН РАЈС КЕЈК СО ЛЕН И СОНЧОГЛЕД 100 ГР")!;
  assert.deepEqual([benlian.price, benlian.regularPrice, benlian.promoKind], [45, 55, "ЛОЈАЛНОСТ"]);
});

test("Рамстор: празна табела е грешка, не празен ценовник", () => {
  assert.throws(() => parseRamstorePage("<html><table id='productsTable'><tbody></tbody></table></html>"), /празна/);
});
