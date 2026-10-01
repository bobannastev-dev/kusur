// Проверки на каталогот и мапата на категории — без мрежа и без ценовници.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CATALOG, TYPES_BY_ID } from "./catalog.ts";
import { CATEGORY_MAP } from "./category-map.ts";

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
