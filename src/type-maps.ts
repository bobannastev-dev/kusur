// Кој тип е ред од ценовникот според прегледаните мапи: синџир со мапа на производи
// (КАМ) се гледа по име на производ, другите по категорија. Двете не се мешаат.

import type { Brands } from "./brands.ts";
import type { CategoryMap } from "./category-map.ts";
import type { ProductMap } from "./product-map.ts";
import type { Offer } from "./types.ts";

export interface TypeMaps {
  categories: CategoryMap;
  products: ProductMap;
  /** Брендови (data/brands.json); без нив кандидатите се без бренд. */
  brands?: Brands;
}

let loaded: TypeMaps | undefined;

/**
 * Мапите од `data/` (category-map.json, product-map.json, brands.json). Само во Node (командите,
 * build-data): се читаат на првото користење, без статички увоз на `node:fs`, за
 * модулите да можат да се вчитаат и во прелистувач (каде се праќаат готови кандидати).
 */
export function defaultTypeMaps(): TypeMaps {
  if (loaded) return loaded;
  const fs = process.getBuiltinModule("node:fs");
  const path = process.getBuiltinModule("node:path");
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", file), "utf8"));
  loaded = { categories: read("category-map.json"), products: read("product-map.json"), brands: read("brands.json") };
  return loaded;
}

/** Дали синџирот се мапира по производ, а не по категорија. */
export function mapsByProduct(maps: TypeMaps, chain: string): boolean {
  return Object.hasOwn(maps.products, chain);
}

/** Прегледаните типови за редот, или undefined ако уште не е прегледан. */
export function reviewedTypes(maps: TypeMaps, chain: string, offer: Offer): string[] | undefined {
  const [table, key] = mapsByProduct(maps, chain)
    ? [maps.products[chain], offer.name]
    : [maps.categories[chain], offer.category];
  return table && Object.hasOwn(table, key) ? table[key] : undefined;
}
