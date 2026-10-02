// Вистински имиња и описи од ценовниците на КАМ Велес (2026-10-02).

import assert from "node:assert/strict";
import { test } from "node:test";
import { proposeTypes } from "./propose.ts";
import type { Offer } from "./types.ts";

const kam = (name: string, description: string): Offer => ({
  name, description, price: 1, regularPrice: null, unitPriceText: "", category: "", promoKind: null, promoUntil: null,
});
const propose = (name: string, description: string) => proposeTypes(kam(name, description));

test("предлог по видот во описот, по марката", () => {
  assert.deepEqual(propose("КОКА КОЛА 2Л", "COCA COLA ПИЈАЛАК ГАЗИРАН").types, ["gaziran-sok"]);
  assert.deepEqual(propose("МЛЕКО 1.5% ТРАЈНО БЕЛЛА ФАРМ", "BELLA FARM МЛЕКО ТРАЈНО 1.5% МАСЛЕНОСТ").types, ["mleko"]);
  assert.deepEqual(propose("ЛЕБ ТОНУС 450 Г СТАНДАРД", "TONUS ЛЕБ СТАНДАРД ОД ИЗРТЕНО ЗРНО").types, ["leb"]);
});

test("млечно чоколадо е чоколадо, не млеко; чоколадно млеко не е млеко", () => {
  assert.deepEqual(propose("ЧОКОЛ.МЛЕЧНО АЛПИКО 100ГР", "ALPIKO ЧОКОЛАДО МЛЕЧНО").types, ["cokolado"]);
  assert.deepEqual(propose("МЛЕКО ЧОК.БЕЛЛА ФАРМ 200МЛ", "BELLA FARM ЧОКОЛАДНО МЛЕКО 2.1% МАСЛЕНОСТ,").types, ["cokoladno-mleko"]);
  assert.deepEqual(propose("МЛЕКО ЗА ТЕЛО НИВЕА 400МЛ", "NIVEA МЛЕКО ЗА ТЕЛО ИНТЕНЗИВНА").types, []);
});

test("правилата по име важат врз името и описот", () => {
  // Кашкавалот е кравји според описот, не според скратеното име.
  assert.deepEqual(propose("КАШКАВАЛ КРАВЈИ ОСОГОВО", "ОСОГОВО КАШКАВАЛ КРАВЈИ").types, ["kashkaval"]);
  assert.deepEqual(propose("КАШКАВАЛ ОВЧИ ОСОГОВО 1КГ", "ОСОГОВО КАШКАВАЛ ОВЧИ МИН.50%").types, ["kashkaval-ovchi"]);
  // Јуфки со јајца не се ни јајца ни „тестенини (макарони, шпагети)".
  assert.deepEqual(propose("ЈУФКИ СО ЈАЈЦА 500ГР ЖИТО ПОЛОГ", "ЖИТО ПОЛОГ ТЕСТЕНИНИ ЈУФКИ СО ЈАЈЦА").types, []);
  assert.deepEqual(propose("МАКАРОНИ СО ЈАЈЦА 500ГР ЖИТО ПОЛОГ", "ЖИТО ПОЛОГ МАКАРОНИ СО ЈАЈЦА").types, ["testenini"]);
});

test("марка што личи на правило не го исклучува производот", () => {
  assert.deepEqual(propose("ЈОГУРТ БУЧЕН КОЗЈАК 3.2% 1КГ", "БУЧЕН КОЗЈАК ЈОГУРТ 3,2% МАСЛЕНОСТ").types, ["jogurt"]);
  assert.deepEqual(propose("КАФЕ ГРАНД ГОЛД 200 Г", "GRAND КАФЕ МЕЛЕНО GOLD").types, ["kafe"]);
  assert.deepEqual(propose("НАДКОПАН ПИЛЕШКИ 1 КГ", "ПИЛЕШКИ НАДКОПАН").types, ["pileshki-kopan"]);
});

test("латинични букви што личат на кирилични", () => {
  assert.deepEqual(propose("СПРАЈТ 1.5Л", "SPRITE ПИЈАЛAК ГАЗИРАН").types, ["gaziran-sok"]);
});

test("непрехрана по првиот збор во описот", () => {
  assert.deepEqual(propose("ХУЛАХОПКИ 40ДЕН", "ХУЛАХОПКИ ЖЕНСКИ 40 DEN"), { types: [], nonFood: true });
  assert.deepEqual(propose("ЦИГАРИ МАРЛБОРО", "ЦИГАРИ MARLBORO RED").nonFood, true);
});

test("свежо овошје: описот е сорта, се гледа името", () => {
  assert.deepEqual(propose("ЈАБОЛКА ГРЕНИ СМИТ КГ", "СОРТА:ГРЕНИ СМИТ").types, ["jabolka"]);
});

test("клучните зборови се за постојни типови; секој тип има по што да се препознае", async () => {
  const { CATALOG, TYPES_BY_ID } = await import("./catalog.ts");
  const { KEYWORDS } = await import("./keywords.ts");
  assert.deepEqual(Object.keys(KEYWORDS).filter((id) => !TYPES_BY_ID.has(id)), []);
  assert.deepEqual(CATALOG.filter((t) => !KEYWORDS[t.id] && !t.require).map((t) => t.id), []);
});
