// Мапа: синџир → име на производ → типови производи (data/product-map.json).
// За синџири без категории во ценовникот (КАМ). Ист договор како мапата на категории:
// [] = свесно не е дел од кошничка, производ без клуч е нов и чека преглед.
// Предлозите (npm run propose) не одат тука сами — само прегледани записи.

import { readFileSync } from "node:fs";
import path from "node:path";

export type ProductMap = Record<string, Record<string, string[]>>;

export const PRODUCT_MAP_PATH = path.join(import.meta.dirname, "..", "data", "product-map.json");

export const PRODUCT_MAP: ProductMap = JSON.parse(readFileSync(PRODUCT_MAP_PATH, "utf8"));
