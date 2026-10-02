// Планирање на набавката: колку чини целата кошничка во секоја продавница
// и дали вреди да се подели на повеќе продавници.

import type { BasketLine } from "./list.ts";
import { cheapestPurchase, type Purchase } from "./match.ts";
import { TYPE_MAPS, type TypeMaps } from "./type-maps.ts";
import type { SnapshotFile } from "./types.ts";

export interface PlanItem {
  line: BasketLine;
  /** Продавницата каде се купува; null ако никаде во планот го нема. */
  store: SnapshotFile | null;
  purchase: Purchase | null;
}

export interface Plan {
  stores: SnapshotFile[];
  items: PlanItem[];
  total: number;
  missing: BasketLine[];
}

/** Најевтиното купување на секоја ставка во секоја продавница — се пресметува еднаш. */
type PurchaseGrid = Map<SnapshotFile, (Purchase | null)[]>;

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), size - 1).map((rest) => [item, ...rest]));
}

/** План за дадено множество продавници: секоја ставка се купува онаму каде е најевтина. */
function planFor(stores: SnapshotFile[], lines: BasketLine[], grid: PurchaseGrid): Plan {
  const items: PlanItem[] = lines.map((line, i) => {
    let best: PlanItem = { line, store: null, purchase: null };
    for (const store of stores) {
      const purchase = grid.get(store)![i];
      if (purchase && (!best.purchase || purchase.cost < best.purchase.cost)) best = { line, store, purchase };
    }
    return best;
  });

  // Продавница од која ништо не се купува не е дел од планот.
  const used = stores.filter((s) => items.some((i) => i.store === s));

  return {
    stores: used,
    items,
    total: items.reduce((sum, i) => sum + (i.purchase?.cost ?? 0), 0),
    missing: items.filter((i) => !i.purchase).map((i) => i.line),
  };
}

/** Подобар е планот со помалку ставки што недостигаат, па со помала сума. */
function isBetter(a: Plan, b: Plan): boolean {
  if (a.missing.length !== b.missing.length) return a.missing.length < b.missing.length;
  return a.total < b.total;
}

export interface BasketComparison {
  /** Целата кошничка во секоја продавница посебно, од најдобра кон најлоша. */
  single: Plan[];
  /** Најдобар план со најмногу `maxStores` продавници (може да е и една). */
  best: Plan;
}

export function compareBasket(
  stores: SnapshotFile[],
  lines: BasketLine[],
  maxStores = 2,
  maps: TypeMaps = TYPE_MAPS,
): BasketComparison {
  const grid: PurchaseGrid = new Map(
    stores.map((s) => [s, lines.map((line) => cheapestPurchase(s, line.type, line.need, maps))]),
  );

  const single = stores.map((s) => planFor([s], lines, grid)).sort((a, b) => (isBetter(a, b) ? -1 : 1));

  let best = single[0];
  for (let size = 2; size <= Math.min(maxStores, stores.length); size++) {
    for (const combo of combinations(stores, size)) {
      const plan = planFor(combo, lines, grid);
      if (isBetter(plan, best)) best = plan;
    }
  }

  return { single, best };
}
