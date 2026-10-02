// Проверки на каталогот и мапата на категории — без мрежа и без ценовници.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG, TYPES_BY_ID } from "./catalog.ts";
import { defaultTypeMaps } from "./type-maps.ts";

const { categories: CATEGORY_MAP, products: PRODUCT_MAP } = defaultTypeMaps();

const mapped = Object.entries(CATEGORY_MAP).flatMap(([chain, cats]) =>
  Object.entries(cats).map(([category, types]) => ({ chain, category, types })),
);

test("секој тип во мапата постои во каталогот", () => {
  const unknown = mapped.flatMap((m) => m.types.filter((id) => !TYPES_BY_ID.has(id)).map((id) => `${m.chain} :: ${m.category} → ${id}`));
  assert.deepEqual(unknown, []);
});

test("секој тип од каталогот има барем една категорија", () => {
  const used = new Set(mapped.flatMap((m) => m.types));
  assert.deepEqual(CATALOG.filter((t) => !used.has(t.id)).map((t) => t.id), []);
});

test("идентификаторите и алијасите се единствени", () => {
  assert.equal(TYPES_BY_ID.size, CATALOG.length);
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const type of CATALOG) {
    for (const alias of type.aliases) {
      if (seen.has(alias)) dupes.push(`„${alias}": ${seen.get(alias)} и ${type.id}`);
      seen.set(alias, type.id);
    }
  }
  assert.deepEqual(dupes, []);
});

test("exclude не смее да ја исклучи целата мапирана категорија", () => {
  const broken = mapped.flatMap((m) =>
    m.types
      .map((id) => TYPES_BY_ID.get(id)!)
      .filter((t) => t?.exclude?.test(` | ${m.category}`.toUpperCase()))
      .map((t) => `${m.chain} :: ${m.category} → ${t.id}`),
  );
  assert.deepEqual(broken, []);
});

test("во мешана категорија најмногу еден тип нема правило по име", () => {
  // Тип без `require` ги зема сите производи од категоријата.
  // Во мешана категорија тоа смее да го прави најмногу еден тип.
  const broken = mapped
    .filter((m) => m.types.length > 1)
    .flatMap((m) => {
      const catchAll = m.types.filter((id) => !TYPES_BY_ID.get(id)?.require);
      return catchAll.length > 1 ? [`${m.chain} :: ${m.category}: ${catchAll.join(", ")}`] : [];
    });
  assert.deepEqual(broken, []);
});

test("мапа на производи: типовите постојат, синџирот не е и во мапата на категории", () => {
  const unknown = Object.entries(PRODUCT_MAP).flatMap(([chain, products]) =>
    Object.entries(products).flatMap(([name, types]) =>
      types.filter((id) => !TYPES_BY_ID.has(id)).map((id) => `${chain} :: ${name} → ${id}`),
    ),
  );
  assert.deepEqual(unknown, []);
  assert.deepEqual(Object.keys(PRODUCT_MAP).filter((chain) => Object.hasOwn(CATEGORY_MAP, chain)), []);
});

// Погрешни избори најдени во систематскиот преглед (2026-10-02): производ од мешана
// категорија што не е типот. Секој случај: категоријата е мапирана на типот, а правилата
// мора да го одбијат производот (и да прифатат вистински од истиот тип).
test("правила: погрешни избори од прегледот се одбиени", async () => {
  const { matchesType } = await import("./match.ts");
  const cases: [typeId: string, category: string, wrong: string, right: string][] = [
    ["sladoled", "Сладолед во кутија", "МРАЗ ИНТЕР ФРОСТ 1кг", "СЛАДОЛЕД ВАНИЛА 1Л"],
    ["vino", "Вино", "ОВОШЕН ПУНЧ СО ВКУС НА ЈАГОДА 750 МЛ 6.5", "ВИНО КУВЕ 750мл БЕЛО"],
    ["krem-sirenje", "Намази", "НАМАЗ РАСТИТЕЛЕН ХУМУС НАТУР/СЕМКИ 240ГР", "КРЕМ НАМАЗ ХАЈДУ 100гр"],
    ["napolitanki", "Вафли", "ШТРУДЛА МЕШАНО ОВОШЈЕ 250 Г ВАФЛИНИ", "НАПОЛИТАНКА 5КА 350гр КАКАО"],
    ["vrekji", "Кеси", "КЕСЕ ЗАМРЗНУВАЧ 2лит 1/33 8мик 1422", "КЕСИ ЃУБРЕ ФИНО 20л 30/1"],
    ["sampon", "Нега на коса", "РЕГ.ЗА КОСА СО АРНИКА И З.ЧАЈ 400МЛ", "ШАМПОН БРЕЗА 930мл. ХЕРБА"],
    ["vloski", "Хигиена", "САМОЛЕПЛИВИ ВЛОШКИ ЗА ПОД ПАЗУВИ М 2КОМ", "ВЛОШКИ СУПЕР СО КРИЛЦА 16/1 АЛУР"],
    ["luk", "Зеленчук", "ЛУК МАКЕДОНСКИ ГЛАВИЦА", "ЛУК СТАР А"],
    // Млад лук се продава по врска, не по кило.
    ["luk", "Зеленчук", "ЛУК МЛАД 3/1", "ЛУК УВОЗЕН 1КГ"],
    ["vino", "Вино", "ПЕНЛИВ КОКТЕЛ БЕЛИНИ 750 МЛ 6%АЛК", "ВИНО ЦРВЕНИ БРЕГОВИ 1Л"],
    // „10кг" е грешка во името кај маркетот (единечната цена вели 1 кг); и инаку не е домашна количина.
    ["sol", "Сол", "СОЛ ЕВРО 10кг МОРСКА", "СОЛ ЕВРО 1кг СИТНА"],
    ["pasta-zabi", "Орална хигиена", "ЛИСТЕРИН ИСПЛАКНУВАЧ сортно 500МЛ", "ПАСТА КОЛИНОС 125гр СУПЕР ВАЈТ"],
    ["sampon", "Нега на коса", "БАЛСАМ ЗА ПРОФЕСИОН.НЕГА НА КОСА 850МЛ", "ШАМПОН ЗА ПРОФ.НЕГА НА КОСА АРГАН 500"],
    ["pivo", "Пиво", "САЈДЕР ЛУБЕЛСКИ КРУША 330мл", "ПИВО ЈОХАН 500мл ЛИМЕНКА"],
    ["techen-detergent", "Перење", "ЛИЛА ОМЕКНУВАЧ СПРИНГ ТАЈМ 4Л.", "САМ ТЕЧЕН ДЕТЕРГЕНТ ЗА АЛИШТА УНИВЕРЗАЛЕН 4Л"],
    ["cokolado", "Чоколади", "КАНДИТ КАКАО ВО ПРАВ 100 ГР", "КАНДИТ МЛЕЧНО ЧОКОЛАДО 80ГР"],
    ["pivo", "Пиво", "ПИВО БАВАРИА 500мл ОРИГИНАЛ 0% ЛИМЕНКА", "ПИВО СКОПСКО 500мл 4.9%"],
    ["omeknuvac", "Перење", "СРЕДСТВ.ЗА БРЗО ПЕГЛАЊЕ НА АЛИШТА 250 МЛ", "ОМЕКНУВАЧ СОФТ 2Л БЛУ"],
  ];
  const problems: string[] = [];
  for (const [typeId, category, wrong, right] of cases) {
    const type = TYPES_BY_ID.get(typeId)!;
    const maps = { products: {}, categories: { Т: { [category]: [typeId] } } };
    const offer = (name: string) => ({ name, price: 1, regularPrice: null, unitPriceText: "", category, description: "", promoKind: null, promoUntil: null });
    if (matchesType(offer(wrong), "Т", type, maps)) problems.push(`${typeId}: прифатен „${wrong}"`);
    if (!matchesType(offer(right), "Т", type, maps)) problems.push(`${typeId}: одбиен „${right}"`);
  }
  assert.deepEqual(problems, []);
});
