// Фикстура: првите 3 страници од ценовникот на КАМ Велес (Id 40), преземен 2026-10-01.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { kamPricelistUrl, parseKamPdf } from "./kam.ts";

const pdf = () => new Uint8Array(readFileSync(new URL("./fixtures/kam-veles-40-p1-3.pdf", import.meta.url)));

test("КАМ: сите редови и датум на ажурирање", async () => {
  const { updatedAt, offers, rowCount } = await parseKamPdf(pdf());
  assert.equal(updatedAt, "30.09.2026 5:49:22AM");
  // По 11 редови „Да/Не" на секоја од 3-те страници (броено и со друга библиотека).
  assert.equal(rowCount, 33);
  assert.equal(offers.length, 33);
});

test("КАМ: ред со акција", async () => {
  const { offers } = await parseKamPdf(pdf());
  const dora = offers.find((o) => o.name === "ТОРТ. ДОРА КАСАЛ ЧОКО 350")!;
  assert.equal(dora.price, 110);
  assert.equal(dora.regularPrice, 129);
  assert.equal(dora.unitPriceText, "100 гр = 31.42 ден.");
  assert.equal(dora.description, "MIDI ТОРТИЧКИ СО ЧОКОЛАДЕН КРЕМ");
  assert.match(dora.promoUntil ?? "", /28\.09\.2026 до 04\.10\.2026/);
});

test("КАМ: ред без акција, опис во повеќе линии", async () => {
  const { offers } = await parseKamPdf(pdf());
  const leb = offers.find((o) => o.name === "ЛЕБ ТОНУС 450 Г СТАНДАРД")!;
  assert.deepEqual(leb, {
    name: "ЛЕБ ТОНУС 450 Г СТАНДАРД",
    price: 75,
    regularPrice: 75,
    unitPriceText: "100 гр = 16.66 ден.",
    category: "",
    description: "TONUS ЛЕБ СТАНДАРД ОД ИЗРТЕНО ЗРНО",
    promoUntil: null,
  });
});

test("КАМ: ред без единечна цена", async () => {
  const { offers } = await parseKamPdf(pdf());
  const first = offers[0];
  assert.equal(first.name, "БОНБОНИ ЕВРОПА НОИР 100ГР");
  assert.equal(first.price, 24);
  assert.equal(first.unitPriceText, "");
});

// Фикстура: продавниците во Велес и една друга од ShopsWeb/LoadShopList (2026-10-01).
const shops = JSON.parse(readFileSync(new URL("./fixtures/kam-shops.json", import.meta.url), "utf8"));

test("КАМ: адреса на ценовникот на продавница", () => {
  assert.equal(kamPricelistUrl(shops, 40), "https://kam.com.mk/2026/10/01/40.pdf");
  assert.equal(kamPricelistUrl(shops, 94), "https://kam.com.mk/2026/10/01/94.pdf");
});

test("КАМ: непозната продавница или продавница без ценовник е грешка", () => {
  assert.throws(() => kamPricelistUrl(shops, 12345), /нема продавница 12345/);
  assert.throws(() => kamPricelistUrl([{ Id: 7, Name: "Тест", ShopFiles: [] }], 7), /нема ценовник/);
  assert.throws(() => kamPricelistUrl({ error: "x" }, 40), /неочекуван одговор/);
});
