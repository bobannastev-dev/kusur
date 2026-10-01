// Фикстури: листите продавници од изворите на 2026-10-01.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { compareWithRegistry, parseKamStores, parseProverkaStores, parseRamstoreStores, type SourceStore } from "./stores-check.ts";
import { IGNORED_STORES, STORES } from "./stores.ts";

const fixture = (name: string) => readFileSync(new URL(`./sources/fixtures/${name}`, import.meta.url), "utf8");
const veles = (list: SourceStore[]) => list.filter((s) => s.inVeles).map((s) => s.sourceId);

test("Жито: продавници од <select>, по вредноста (не по бројот во името)", () => {
  const stores = parseProverkaStores(fixture("zito-veles.html"));
  assert.ok(stores.length > 90);
  assert.deepEqual(stores.find((s) => s.sourceId === "2"), { sourceId: "2", label: "2 Трговски - Велес", inVeles: true });
  // Вредноста 31 има име „95 Кавадарци 2" — важи вредноста.
  assert.equal(stores.find((s) => s.sourceId === "31")?.label, "95 Кавадарци 2");
  assert.equal(stores.find((s) => s.sourceId === "31")?.inVeles, false);
});

test("Стокомак: продавници во Велес", () => {
  assert.deepEqual(veles(parseProverkaStores(fixture("stokomak-veles.html"))), ["41", "65"]);
});

test("Рамстор: продавници од страницата /marketi/", () => {
  const stores = parseRamstoreStores(fixture("ramstore-marketi.html"));
  assert.equal(stores.length, 36);
  assert.deepEqual(veles(stores), ["ramstor-veles"]);
});

test("КАМ: продавници од ShopsWeb/LoadShopList", () => {
  assert.deepEqual(veles(parseKamStores(JSON.parse(fixture("kam-shops.json")))), ["40", "94", "61"]);
});

test("споредба со регистарот: нови, исчезнати, изоставени", () => {
  const found: SourceStore[] = [
    { sourceId: "2", label: "2 Трговски - Велес", inVeles: true },
    { sourceId: "10", label: "10 Жито Ване Кат", inVeles: false },
    { sourceId: "55", label: "55 Којник - Велес", inVeles: true },
    { sourceId: "78", label: "78 Ла Фамилиа Велес", inVeles: true },
    { sourceId: "3", label: "3 Струмица 4", inVeles: false },
  ];
  const registry = [{ chain: "Жито", sourceId: "2" }, { chain: "Жито", sourceId: "7" }];
  const ignored = [{ chain: "Жито", sourceId: 55 }, { chain: "Жито", sourceId: 10 }];

  const result = compareWithRegistry("Жито", found, registry, ignored);
  assert.deepEqual(result.missing.map((s) => s.sourceId), ["78"]);
  assert.deepEqual(result.gone, ["7"]);
  assert.deepEqual(result.ignored.map((s) => s.sourceId), ["10", "55"]);
});

test("вистинскиот регистар: секоја продавница има sourceId", () => {
  for (const s of STORES) assert.ok(s.sourceId, s.id);
  assert.equal(IGNORED_STORES.length, 4);
});
