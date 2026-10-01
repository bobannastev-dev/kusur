import assert from "node:assert/strict";
import { test } from "node:test";
import { compareBasket } from "./basket.ts";
import type { CategoryMap } from "./category-map.ts";
import { parseList } from "./list.ts";
import type { Offer, SnapshotFile } from "./types.ts";

function offer(name: string, price: number, category: string, unitPriceText = ""): Offer {
  return { name, price, regularPrice: null, unitPriceText, category };
}

function store(label: string, offers: Offer[]): SnapshotFile {
  return { storeId: label, chain: label, label, city: "Велес", fetchedAt: "", updatedAt: null, offers };
}

const A = store("А", [
  offer("МЛЕКО ТРАЈНО 1Л", 50, "ТРАЈНО МЛЕКО"),
  offer("МЛЕКО ЧОКОЛАДНО 1Л", 20, "ТРАЈНО МЛЕКО"), // не е обично млеко
  offer("ЈАЈЦА М 10/1", 80, "ЈАЈЦА"),
  offer("ЈАЈЦА М 30/1", 200, "ЈАЈЦА"),
  offer("КРАВЈО СИРЕЊЕ ВАКУМ КГ", 400, "КРАВЈО СИРЕЊЕ", "100 ГР: =40ДЕН"),
  offer("ШЕЌЕР 900Г", 45, "ШЕЌЕР"),
  offer("ШЕЌЕР 1КГ", 30, "СЛАТКИ"), // категорија што не е мапирана
]);

const B = store("Б", [
  offer("МЛЕКО 1л 2.8%", 60, "Млеко ухт"),
  offer("ЈАЈЦА Л 10/1", 70, "Јајца"),
  offer("СИРЕЊЕ КРАВЈО РЕФУС", 300, "Млечни"), // мешана категорија
  offer("СИРЕЊЕ ОВЧО РЕФУС", 250, "Млечни"),
]);

const MAP: CategoryMap = {
  А: { "ТРАЈНО МЛЕКО": ["mleko"], "ЈАЈЦА": ["jajca"], "КРАВЈО СИРЕЊЕ": ["sirenje"], "ШЕЌЕР": ["seker"] },
  Б: { "Млеко ухт": ["mleko"], "Јајца": ["jajca"], "Млечни": ["sirenje", "sirenje-ovcho"] },
};

test("parseList: количини и непознати ставки", () => {
  const { lines, unknown } = parseList("млеко, 10 јајца, 2 млека, 300г сирење и авокадо");
  assert.deepEqual(
    lines.map((l) => [l.type.id, l.need]),
    [["mleko", 1], ["jajca", 10], ["mleko", 2], ["sirenje", 0.3]],
  );
  assert.deepEqual(unknown, ["авокадо"]);
});

test("parseList: цели зборови, подолги алијаси и „кило\"", () => {
  const { lines, unknown } = parseList("нескафе, кисело млеко, кило сирење, 2 литри млеко, солени стапчиња");
  assert.deepEqual(
    lines.map((l) => [l.type.id, l.need]),
    [["instant-kafe", 0.1], ["kiselo-mleko", 0.4], ["sirenje", 1], ["mleko", 2]],
  );
  assert.deepEqual(unknown, ["солени стапчиња"]);
});

test("една продавница: најевтин соодветен производ и покривање на количината", () => {
  const { lines } = parseList("млеко, 20 јајца, сирење, шеќер");
  const { single } = compareBasket([A, B], lines, 1, MAP);

  const planA = single.find((p) => p.stores[0] === A)!;
  // млеко 50 (не чоколадното) + 2×10 јајца 160 (поевтино од табла 200) + 0.5кг сирење 200 + шеќер 900г за 1кг 45
  assert.equal(planA.total, 50 + 160 + 200 + 45);
  assert.equal(planA.missing.length, 0);

  // Во мешаната категорија на Б, „сирење" е само кравјото (овчото е поевтино, но друг тип).
  const planB = single.find((p) => p.stores[0] === B)!;
  assert.equal(planB.total, 60 + 140 + 150);
  assert.deepEqual(planB.missing.map((l) => l.type.id), ["seker"]);

  // Целосна кошничка е пред поевтина, но нецелосна.
  assert.equal(single[0], planA);
});

test("две продавници: секоја ставка онаму каде е поевтина", () => {
  const { lines } = parseList("млеко, 10 јајца, сирење");
  const { best } = compareBasket([A, B], lines, 2, MAP);
  assert.equal(best.total, 50 + 70 + 150);
  assert.deepEqual(best.stores, [A, B]);
});

test("втора продавница не се предлага кога не носи заштеда", () => {
  const { lines } = parseList("млеко, шеќер");
  const { best } = compareBasket([A, B], lines, 2, MAP);
  assert.deepEqual(best.stores, [A]);
});
