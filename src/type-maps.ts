// Кој тип е ред од ценовникот според прегледаните мапи: синџир со мапа на производи
// (КАМ) се гледа по име на производ, другите по категорија. Двете не се мешаат.

import { CATEGORY_MAP, type CategoryMap } from "./category-map.ts";
import { PRODUCT_MAP, type ProductMap } from "./product-map.ts";
import type { Offer } from "./types.ts";

export interface TypeMaps {
  categories: CategoryMap;
  products: ProductMap;
}

export const TYPE_MAPS: TypeMaps = { categories: CATEGORY_MAP, products: PRODUCT_MAP };

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
