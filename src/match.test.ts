import assert from "node:assert/strict";
import { test } from "node:test";
import { compareBasket } from "./basket.ts";
import { CATALOG } from "./catalog.ts";
import type { CategoryMap } from "./category-map.ts";
import { parseList } from "./list.ts";
import { cheapestPurchase, comparisonPrice } from "./match.ts";
import type { Offer, SnapshotFile } from "./types.ts";

function offer(name: string, price: number, regularPrice: number | null, promoKind: string | null, category = "ОРИЗ"): Offer {
  return { name, price, regularPrice, unitPriceText: "", category, description: "", promoKind, promoUntil: null };
}

function store(label: string, offers: Offer[]): SnapshotFile {
  return { storeId: label, chain: label, label, city: "Велес", fetchedAt: "", updatedAt: null, offers };
}

const MAP: CategoryMap = { Р: { "ОРИЗ": ["oriz"] }, Ж: { "Ориз": ["oriz"] } };
const oriz = CATALOG.find((t) => t.id === "oriz")!;

test("comparisonPrice: клуб-цена (ЛОЈАЛНОСТ) се споредува со редовната цена", () => {
  const benlian = offer("БЕНЛИАН РАЈС КЕЈК СО ЛЕН И СОНЧОГЛЕД 100 ГР", 45, 55, "ЛОЈАЛНОСТ");
  assert.deepEqual(comparisonPrice(benlian), { price: 55, loyaltyPrice: 45 });
});

test("comparisonPrice: обична акција се споредува со продажната цена", () => {
  const rizo = offer("РИСО СКОТИ ОРИЗ ПАРБОИЛД 1 КГ", 179, 255, "АКЦИСКА ПРОДАЖБА");
  assert.deepEqual(comparisonPrice(rizo), { price: 179, loyaltyPrice: null });
  assert.deepEqual(comparisonPrice(offer("ОРИЗ 1 КГ", 100, null, null)), { price: 100, loyaltyPrice: null });
});

test("comparisonPrice: клуб-цена без објавена редовна цена останува продажната", () => {
  assert.deepEqual(comparisonPrice(offer("ОРИЗ 1 КГ", 100, null, "ЛОЈАЛНОСТ")), { price: 100, loyaltyPrice: null });
});

test("купување: цената е без картичка, клуб-цената се носи за приказ", () => {
  const r = store("Р", [offer("ОРИЗ БЕЛ 1 КГ", 90, 130, "ЛОЈАЛНОСТ")]);
  const p = cheapestPurchase(r, oriz, 2, MAP)!;
  assert.deepEqual([p.packs, p.price, p.cost, p.loyaltyPrice], [2, 130, 260, 90]);
});

test("кошничка: клуб-цената не го прави производот или продавницата најевтини", () => {
  const r = store("Р", [
    offer("ОРИЗ БЕЛ 1 КГ", 90, 130, "ЛОЈАЛНОСТ"),
    offer("ОРИЗ ДОМАШЕН 1 КГ", 120, 120, null),
  ]);
  const z = store("Ж", [offer("ОРИЗ 1КГ", 110, 110, null, "Ориз")]);

  // Во Р најевтин без картичка е домашниот (120), не клуб-понудата (130 без картичка).
  assert.equal(cheapestPurchase(r, oriz, 1, MAP)!.offer.name, "ОРИЗ ДОМАШЕН 1 КГ");

  const { single } = compareBasket([r, z], parseList("ориз").lines, 1, MAP);
  assert.deepEqual(single.map((p) => [p.stores[0].label, p.total]), [["Ж", 110], ["Р", 120]]);
});
