import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { brandErrors, brandOf, type Brands } from "./brands.ts";
import { CATALOG } from "./catalog.ts";
import { findCandidates } from "./match.ts";
import { buildBundle } from "./publish/build.ts";
import { fromBundle } from "./publish/bundle.ts";
import type { TypeMaps } from "./type-maps.ts";
import type { Offer, SnapshotFile } from "./types.ts";

const BRANDS: Brands = JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "data", "brands.json"), "utf8"));
const TYPE_IDS = new Set(CATALOG.map((t) => t.id));

const offer = (name: string, price: number, category: string, description = ""): Offer => ({
  name, price, regularPrice: null, unitPriceText: "", category, description, promoKind: null, promoUntil: null,
});

test("брендови: data/brands.json е исправен", () => {
  assert.deepEqual(brandErrors(BRANDS, TYPE_IDS), []);
});

test("брендови: се препознаваат од името, од описот и на латиница", () => {
  assert.equal(brandOf(offer("ДЕТЕРГЕНТ РЕГУЛАР ПЕРСИЛ 2.25КГ", 499, ""), "prashok", BRANDS), "persil");
  assert.equal(brandOf(offer("КАФЕ ИНСТ.НЕСКАФЕ КЛАСИК 200ГР", 435, ""), "instant-kafe", BRANDS), "nescafe");
  // КАМ: брендот само во описот.
  assert.equal(brandOf(offer("ИНСТАНТ КАФЕ 200ГР", 435, "", "NESCAFE КАФЕ ИНСТАНТ CLASSIC"), "instant-kafe", BRANDS), "nescafe");
  // Само за наведените типови и само на почеток на збор.
  assert.equal(brandOf(offer("ПРАШОК ПЕРСИЛ 5КГ", 899, ""), "omeknuvac", BRANDS), null);
  assert.equal(brandOf(offer("ИНСТАНТ КАФЕ ДОНЕСКАФЕ 100ГР", 99, ""), "instant-kafe", BRANDS), null);
});

test("брендови: при два бренда во името победува првиот", () => {
  const brands: Brands = {
    milka: { label: "Милка", patterns: ["МИЛКА"], types: ["cokolado"] },
    oreo: { label: "Орео", patterns: ["ОРЕО"], types: ["cokolado"] },
  };
  assert.equal(brandOf(offer("ЧОКОЛАДО МИЛКА СО ОРЕО 100Г", 99, ""), "cokolado", brands), "milka");
});

test("брендови: грешките во фајлот се фатени", () => {
  const overlap: Brands = {
    nes: { label: "Нес", patterns: ["НЕС"], types: ["instant-kafe"] },
    nescafe: { label: "Nescafé", patterns: ["НЕСКАФЕ"], types: ["instant-kafe"] },
  };
  assert.deepEqual(brandErrors(overlap, TYPE_IDS), ["nes и nescafe се преклопуваат на ист тип"]);
  // На различни типови истиот збор не смета.
  assert.deepEqual(brandErrors({ ...overlap, nes: { ...overlap.nes, types: ["prashok"] } }, TYPE_IDS), []);

  const broken: Brands = {
    a: { label: "А", patterns: ["А("], types: ["nema-takov"], aliases: ["а"] },
    b: { label: "Б", patterns: ["б"], types: ["prashok"], aliases: ["а"] },
  };
  assert.deepEqual(brandErrors(broken, TYPE_IDS), [
    "a: непознат тип nema-takov",
    "a: неважечки шаблон „А(\"",
    "b: шаблонот „б\" не е со големи букви",
    "алијасот „а\" е и кај a и кај b",
  ]);
});

test("брендови: кандидатите и пакетот го носат брендот", () => {
  const instant = CATALOG.find((t) => t.id === "instant-kafe")!;
  const maps: TypeMaps = { categories: { А: { "КАФЕ": ["instant-kafe"] } }, products: {}, brands: BRANDS };
  const snapshot: SnapshotFile = {
    storeId: "a", chain: "А", label: "а", city: "Велес", fetchedAt: "2026-01-10T08:00:00.000Z", updatedAt: null,
    offers: [offer("НЕСКАФЕ КЛАСИК 200ГР", 435, "КАФЕ"), offer("ИНСТАНТ КАФЕ 200ГР", 300, "КАФЕ")],
  };
  const brandsOf = (list: { offer: Offer; brand?: string }[]) => list.map((c) => [c.offer.name, c.brand]);
  const expected = [["НЕСКАФЕ КЛАСИК 200ГР", "nescafe"], ["ИНСТАНТ КАФЕ 200ГР", undefined]];
  assert.deepEqual(brandsOf(findCandidates(snapshot, instant, maps)), expected);

  const bundle = buildBundle([{ date: "2026-01-10", snapshot, changes: [] }], [instant], maps, "2026-01-10");
  assert.deepEqual(bundle.brands, { nescafe: "Nescafé" });
  const view = fromBundle(JSON.parse(JSON.stringify(bundle)));
  assert.deepEqual(brandsOf(view.candidatesFor(view.stores[0], instant)), expected);
});
