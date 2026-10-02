// Цени, количини и имиња за приказ.

import type { ProductType } from "../../src/catalog.ts";
import type { Unit } from "../../src/types.ts";

export const den = (n: number) => `${n.toLocaleString("mk-MK")} ден.`;

export function formatAmount(amount: number, unit: Unit): string {
  if (unit === "pc") return `${amount} парч.`;
  const [small, big] = unit === "kg" ? ["г", "кг"] : ["мл", "л"];
  return amount < 1 ? `${Math.round(amount * 1000)} ${small}` : `${Number(amount.toFixed(2)).toLocaleString("mk-MK")} ${big}`;
}

/** Кратко име за меур: „Млеко" наместо „Млеко (кравјо, трајно)". */
export function shortName(type: ProductType): string {
  const alias = type.aliases[0];
  return alias.charAt(0).toUpperCase() + alias.slice(1);
}

/** „10 јајца" за парчиња, „Сирење 500 г" за другото. */
export function itemLabel(type: ProductType, need: number): { name: string; amount: string } {
  return { name: shortName(type), amount: formatAmount(need, type.unit) };
}
