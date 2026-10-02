// Пребарување низ типовите производи по алијаси, и на кирилица и на латиница („mleko").

import { CATALOG, type ProductType } from "../../src/catalog.ts";

const LATIN: [string, string][] = [
  ["dzh", "џ"], ["gj", "ѓ"], ["kj", "ќ"], ["lj", "љ"], ["nj", "њ"], ["zh", "ж"], ["ch", "ч"], ["sh", "ш"], ["dz", "ѕ"],
  ["a", "а"], ["b", "б"], ["v", "в"], ["g", "г"], ["d", "д"], ["e", "е"], ["z", "з"], ["i", "и"], ["j", "ј"], ["k", "к"],
  ["l", "л"], ["m", "м"], ["n", "н"], ["o", "о"], ["p", "п"], ["r", "р"], ["s", "с"], ["t", "т"], ["u", "у"], ["f", "ф"],
  ["h", "х"], ["c", "ц"], ["w", "в"], ["y", "ј"], ["x", "кс"], ["q", "к"],
];

/** „mleko" → „млеко"; кирилицата останува. */
export function toCyrillic(text: string): string {
  let out = text.toLowerCase();
  for (const [latin, cyr] of LATIN) out = out.replaceAll(latin, cyr);
  return out;
}

/** Типовите чиј алијас почнува со барањето (прво) или го содржи. */
export function searchTypes(query: string, limit = 12): ProductType[] {
  const q = toCyrillic(query.trim());
  if (!q) return [];
  const starts: ProductType[] = [];
  const contains: ProductType[] = [];
  for (const type of CATALOG) {
    const names = [...type.aliases, type.label.toLowerCase()];
    if (names.some((n) => n.startsWith(q) || n.split(" ").some((w) => w.startsWith(q)))) starts.push(type);
    else if (names.some((n) => n.includes(q))) contains.push(type);
  }
  return [...starts, ...contains].slice(0, limit);
}
