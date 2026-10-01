// Читање на списокот на купувачот: „млеко, 10 јајца, сирење, кафе и прашок за перење".
//
// Ова е детерминистичка верзија што ги препознава типовите од каталогот. Во производот
// овој чекор го презема AI модел (слободен текст/говор -> типови и количини), а
// пресметките и понатаму остануваат во обичен код.

import { CATALOG, type ProductType } from "./catalog.ts";
import { parseQuantity } from "./parse.ts";

export interface BasketLine {
  type: ProductType;
  /** Потребна количина во единицата на типот. */
  need: number;
}

export interface ParsedList {
  lines: BasketLine[];
  /** Делови од списокот што не ги препознавме. */
  unknown: string[];
}

// Подолгите алијаси први: „кисело млеко" пред „млеко". Алијасот мора да е цел збор,
// за „кафе" да не се најде во „нескафе", ни „сол" во „солени".
const ALIASES = CATALOG.flatMap((type) =>
  type.aliases.map((alias) => ({ type, alias, re: new RegExp(`(?<!\\p{L})${alias}(?!\\p{L})`, "u") })),
).sort((a, b) => b.alias.length - a.alias.length);

function findType(text: string): ProductType | undefined {
  return ALIASES.find(({ re }) => re.test(text))?.type;
}

/** „кило сирење" -> „1кг сирење", „2 литри млеко" -> „2л млеко". */
function normalizeUnits(text: string): string {
  return text
    .replace(/(\d+(?:[.,]\d+)?)?\s*(?:кило|кила|килограм|килограми)(?!\p{L})/gu, (_, n) => `${n ?? 1}кг`)
    .replace(/(\d+(?:[.,]\d+)?)?\s*(?:литар|литри|литра)(?!\p{L})/gu, (_, n) => `${n ?? 1}л`);
}

export function parseList(input: string): ParsedList {
  const lines: BasketLine[] = [];
  const unknown: string[] = [];

  const parts = input
    .toLowerCase()
    .split(/[,;\n]|\s+и\s+/u)
    .map((p) => p.trim().replace(/\.$/, ""))
    .filter(Boolean);

  for (const raw of parts) {
    const part = normalizeUnits(raw);
    const type = findType(part);
    if (!type) {
      unknown.push(raw);
      continue;
    }

    const units = [type.unit, ...(type.equivalentUnits ?? [])];
    const measured = parseQuantity(part, units.filter((u) => u !== "pc"));
    const count = /(\d+)/.exec(part);

    let need = type.defaultAmount;
    if (measured) need = measured.amount; // „2л млеко", „500г сирење"
    else if (count && type.unit === "pc") need = Number(count[1]); // „10 јајца"
    else if (count) need = Number(count[1]) * type.defaultAmount; // „2 млека" = 2 пакувања

    lines.push({ type, need });
  }

  return { lines, unknown };
}
