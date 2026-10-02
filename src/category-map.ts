// Мапа: синџир → категорија на маркетот → типови производи (data/category-map.json).
// [] значи дека категоријата свесно не е дел од кошничка (играчки, облека...).
// Категорија што ја нема во мапата е нова и чека преглед (npm run categories).

import { readFileSync } from "node:fs";
import path from "node:path";

export type CategoryMap = Record<string, Record<string, string[]>>;

export const CATEGORY_MAP_PATH = path.join(import.meta.dirname, "..", "data", "category-map.json");

export const CATEGORY_MAP: CategoryMap = JSON.parse(readFileSync(CATEGORY_MAP_PATH, "utf8"));

/** Типовите за категорија, или undefined ако категоријата уште не е прегледана. */
export function typesFor(map: CategoryMap, chain: string, category: string): string[] | undefined {
  const table = map[chain];
  return table && Object.hasOwn(table, category) ? table[category] : undefined;
}
