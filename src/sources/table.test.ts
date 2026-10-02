import assert from "node:assert/strict";
import { test } from "node:test";
import { rowToOffer, type ColumnMap } from "./table.ts";

const COLS: ColumnMap = { name: 0, price: 1, unitPrice: 2, category: 3, availability: 4, regularPrice: 5, promoKind: 7, promoUntil: 8 };

test("производ што го нема во продавницата не влегува", () => {
  assert.equal(rowToOffer(["ЛЕБ", "35 ден.", "", "ЛЕБОВИ", "Не", "35 ден."], COLS), null);
  assert.equal(rowToOffer(["ЛЕБ", "35.00", "", "ЛЕБОВИ", "НЕ", ""], COLS), null);
});

test("ред без име или без цена не влегува", () => {
  assert.equal(rowToOffer(["", "35 ден.", "", "ЛЕБОВИ", "Да", ""], COLS), null);
  assert.equal(rowToOffer(["ЛЕБ", "", "", "ЛЕБОВИ", "Да", ""], COLS), null);
});
