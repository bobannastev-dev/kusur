// Поврзување: кои редови од ценовникот одговараат на тип производ и колку
// чини да се купи потребната количина. Сè овде е обичен, проверлив код.

import type { ProductType } from "./catalog.ts";
import { CATEGORY_MAP, typesFor, type CategoryMap } from "./category-map.ts";
import { parseQuantity, parseUnitPrice } from "./parse.ts";
import type { Offer, SnapshotFile } from "./types.ts";

/** Пакување од 900г се смета дека покрива потреба од 1кг (исто 905мл масло за 1л). */
const SIZE_TOLERANCE = 0.12;
/** Никој не купува 27 порции мед од 15г наместо тегла. */
const MAX_PACKS = 6;

export interface Candidate {
  offer: Offer;
  /** Количина на едно пакување во единицата на типот. */
  packAmount: number;
  /** Се мери на каса — може да се купи точно потребната количина. */
  divisible: boolean;
}

export interface Purchase extends Candidate {
  packs: number;
  /** Количина што реално се добива. */
  amount: number;
  cost: number;
}

function unitsOf(type: ProductType) {
  return [type.unit, ...(type.equivalentUnits ?? [])];
}

function resolvePack(offer: Offer, type: ProductType): Pick<Candidate, "packAmount" | "divisible"> | null {
  const units = unitsOf(type);

  // 1. Количината напишана во името е најсигурна.
  const fromName = parseQuantity(offer.name, units);
  if (fromName && fromName.amount > 0) return { packAmount: fromName.amount, divisible: false };

  // 2. Инаку ја изведуваме од единечната цена што ја објавил маркетот.
  const unitPrice = parseUnitPrice(offer.unitPriceText);
  // Цена „по парче" кај тип што се мери во кг не е цена по килограм („ЛУК СТАР ПАРЧЕ").
  if (unitPrice && !units.includes(unitPrice.unit)) return null;
  if (unitPrice && unitPrice.price > 0) {
    const amount = offer.price / unitPrice.price;
    if (type.byWeight && Math.abs(amount - 1) < 0.02) return { packAmount: 1, divisible: true };
    if (amount >= 0.005 && amount <= 100) return { packAmount: Number(amount.toFixed(3)), divisible: false };
  }

  // 3. Производ на мерење без количина во името: цената е по килограм.
  if (type.byWeight) return { packAmount: 1, divisible: true };

  return null;
}

/** Дали редот од ценовникот е од дадениот тип (без да се гледа количината). */
export function matchesType(offer: Offer, chain: string, type: ProductType, map: CategoryMap = CATEGORY_MAP): boolean {
  if (!typesFor(map, chain, offer.category)?.includes(type.id)) return false;

  const name = offer.name.toUpperCase();
  if (type.require && !type.require.test(name)) return false;
  if (type.exclude?.test(`${name} | ${offer.category.toUpperCase()}`)) return false;
  return true;
}

export function findCandidates(store: SnapshotFile, type: ProductType, map: CategoryMap = CATEGORY_MAP): Candidate[] {
  const candidates: Candidate[] = [];
  for (const offer of store.offers) {
    if (!matchesType(offer, store.chain, type, map)) continue;
    const pack = resolvePack(offer, type);
    if (pack) candidates.push({ offer, ...pack });
  }
  return candidates;
}

function purchase(candidate: Candidate, need: number): Purchase {
  if (candidate.divisible) {
    return { ...candidate, packs: 1, amount: need, cost: Math.round(candidate.offer.price * need) };
  }
  const packs = Math.max(1, Math.ceil((need * (1 - SIZE_TOLERANCE)) / candidate.packAmount - 1e-9));
  return { ...candidate, packs, amount: packs * candidate.packAmount, cost: packs * candidate.offer.price };
}

/** Најевтиниот начин да се купи `need` од дадениот тип во една продавница. */
export function cheapestPurchase(
  store: SnapshotFile,
  type: ProductType,
  need: number,
  map: CategoryMap = CATEGORY_MAP,
): Purchase | null {
  let best: Purchase | null = null;
  for (const candidate of findCandidates(store, type, map)) {
    const p = purchase(candidate, need);
    if (p.packs > MAX_PACKS) continue;
    // При иста сума, подобро е пакувањето што дава повеќе.
    if (!best || p.cost < best.cost || (p.cost === best.cost && p.amount > best.amount)) best = p;
  }
  return best;
}
