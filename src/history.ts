// Историја на цените од дневните промени (ChangesRecord): колку чинел производот
// кој било ден. Чисти функции — читањето од PriceStore е во командите.

import type { ChangesRecord } from "./price-store.ts";
import type { Offer } from "./types.ts";

/** Набљудување: цената тој ден, или null ако производот го немало. */
export interface PricePoint {
  date: string;
  price: number | null;
  /** Набљудувањето е „додаден": пред него производот го немало. */
  added?: boolean;
}

/** Кога има повеќе набљудувања за ист ден, победува потежкото. */
const WEIGHT = {
  /** Цена на претходниот ден, изведена од промена (`oldPrice`, исчезнат производ). */
  previous: 0,
  /** Запис за самиот ден. */
  sameDay: 1,
  /** Тековната снимка. */
  current: 2,
} as const;

/**
 * Серија на цени за производ во една продавница, по датум.
 * `changes` се записите на таа продавница; `current` е нејзината најнова снимка.
 */
export function priceSeries(
  changes: ChangesRecord[],
  current: { date: string; offer: Offer | undefined },
  name: string,
): PricePoint[] {
  const points = new Map<string, { point: PricePoint; weight: number }>();
  const put = (point: PricePoint, weight: number) => {
    const existing = points.get(point.date);
    if (!existing || weight >= existing.weight) points.set(point.date, { point, weight });
  };

  for (const r of [...changes].sort((a, b) => a.date.localeCompare(b.date))) {
    const added = r.added.find((o) => o.name === name);
    if (added) put({ date: r.date, price: added.price, added: true }, WEIGHT.sameDay);

    const changed = r.changed.find((c) => c.name === name);
    if (changed) {
      if (r.prevDate) put({ date: r.prevDate, price: changed.oldPrice }, WEIGHT.previous);
      put({ date: r.date, price: changed.newPrice }, WEIGHT.sameDay);
    }

    const removed = r.removed.find((o) => o.name === name);
    if (removed) {
      if (r.prevDate) put({ date: r.prevDate, price: removed.price }, WEIGHT.previous);
      put({ date: r.date, price: null }, WEIGHT.sameDay);
    }
  }
  if (current.offer) put({ date: current.date, price: current.offer.price }, WEIGHT.current);

  return [...points.values()].map((p) => p.point).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Цената на датумот: последното набљудување до тој ден; пред првото набљудување —
 * истата цена, освен ако првото е „додаден" (тогаш производот го немало).
 */
export function priceOn(series: PricePoint[], date: string): number | null {
  let last: PricePoint | undefined;
  for (const p of series) {
    if (p.date > date) break;
    last = p;
  }
  if (last) return last.price;
  const first = series[0];
  return !first || first.added ? null : first.price;
}
