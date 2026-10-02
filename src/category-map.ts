// Мапа: синџир → категорија на маркетот → типови производи (data/category-map.json).
// [] значи дека категоријата свесно не е дел од кошничка (играчки, облека...).
// Категорија што ја нема во мапата е нова и чека преглед (npm run categories).

export type CategoryMap = Record<string, Record<string, string[]>>;
