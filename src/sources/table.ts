import type { Offer } from "../types.ts";
import { parsePrice } from "../parse.ts";

/** Каде се наоѓаат колоните во законски пропишаната табела кај даден маркет. */
export interface ColumnMap {
  name: number;
  price: number;
  unitPrice: number;
  category: number;
  availability: number;
  regularPrice: number;
  /** „Времетраење на промоција" — постои само во редовите со акција. */
  promoUntil: number;
}

/**
 * Претвора еден ред од стандардизираната табела во `Offer`.
 * Враќа null за ред без име/цена или за производ што го нема во продавницата.
 */
export function rowToOffer(cells: string[], cols: ColumnMap): Offer | null {
  const name = cells[cols.name]?.trim();
  if (!name) return null;
  if ((cells[cols.availability] ?? "").trim().toUpperCase().startsWith("НЕ")) return null;

  const price = parsePrice(cells[cols.price] ?? "");
  if (price === null || price <= 0) return null;

  return {
    name,
    price,
    regularPrice: parsePrice(cells[cols.regularPrice] ?? ""),
    unitPriceText: (cells[cols.unitPrice] ?? "").trim(),
    category: (cells[cols.category] ?? "").trim(),
    description: "",
    // Рамстор го пишува рокот во повеќе редови. Категоријата не се нормализира:
    // мапата на категории зависи од точниот текст („ГАЗИРАНА  ВОДА").
    promoUntil: cells[cols.promoUntil]?.replace(/\s+/g, " ").trim() || null,
  };
}
