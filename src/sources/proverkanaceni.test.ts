// Фикстури: вистински страници од 2026-10-01, скратени на 15 реда (src/sources/fixtures/).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseProverkaPage } from "./proverkanaceni.ts";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

test("Жито: редови, датум на ажурирање, ред без акција", () => {
  const { updatedAt, offers, rowCount } = parseProverkaPage(fixture("zito-veles.html"));
  assert.equal(updatedAt, "01/10/2026 21:05");
  assert.equal(rowCount, 15);
  assert.equal(offers.length, 15);
  // Колку производи објавува изворот за целото пребарување (фикстурата е скратена).
  assert.equal(parseProverkaPage(fixture("zito-veles.html")).total, 63);
  assert.deepEqual(offers[0], {
    name: "МЛЕКО АЛПСКО 3.5% 1л СЛОВЕНСКО",
    price: 82,
    regularPrice: 82,
    unitPriceText: "100ml = 8.20 ден.",
    category: "Млеко ухт",
    description: "",
    promoUntil: null,
  });
});

test("Жито: ред со акција", () => {
  const { offers } = parseProverkaPage(fixture("zito-veles.html"));
  const milkland = offers.find((o) => o.name === "МЛЕКО МИЛКЛЕНД 1л 1.5% СО ЧЕП")!;
  assert.equal(milkland.price, 44);
  assert.equal(milkland.regularPrice, 49);
  assert.equal(milkland.promoUntil, "25.09.2026 до 09.10.2026");
});

test("Стокомак: иста платформа, друг синџир", () => {
  const { updatedAt, offers, total } = parseProverkaPage(fixture("stokomak-veles.html"));
  assert.equal(updatedAt, "01/10/2026 21:05");
  assert.equal(total, 2610);
  assert.equal(offers.length, 15);
  const limon = offers.find((o) => o.name === "ЛИМОН СВЕЖ КГР")!;
  assert.deepEqual(
    [limon.price, limon.regularPrice, limon.unitPriceText, limon.category, limon.promoUntil],
    [39, 79, "1кгр = 39.00 ден.", "СВЕЖО ОВОШЈЕ", "28.09.2026 до 04.10.2026"],
  );
});
