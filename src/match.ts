// Поврзување: кои редови од ценовникот одговараат на тип производ и колку
// чини да се купи потребната количина. Сè овде е обичен, проверлив код.

import { brandOf } from "./brands.ts";
import type { ProductType } from "./catalog.ts";
import { normalizeLookalikes, parseQuantity, parseUnitPrice } from "./parse.ts";
import { mapsByProduct, reviewedTypes, defaultTypeMaps, type TypeMaps } from "./type-maps.ts";
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
  /** Ид на брендот (data/brands.json), ако е препознаен. */
  brand?: string;
}

export interface Purchase extends Candidate {
  /** Цена на едно пакување (или по кг) за споредба — без клуб-картичка. */
  price: number;
  /** Цена со клуб-картичка, само за приказ; null ако нема клуб-цена. */
  loyaltyPrice: number | null;
  packs: number;
  /** Количина што реално се добива. */
  amount: number;
  cost: number;
}

/** Видови акција што важат само со картичка на синџирот (засега Рамстор). */
const LOYALTY_PROMO_KINDS = new Set(["ЛОЈАЛНОСТ"]);

/**
 * Со која цена се споредува редот. Клуб-цената не ја добива секој купувач,
 * па се споредува редовната, а клуб-цената се носи за приказ.
 */
export function comparisonPrice(offer: Offer): { price: number; loyaltyPrice: number | null } {
  const loyalty = offer.promoKind != null && LOYALTY_PROMO_KINDS.has(offer.promoKind.toUpperCase());
  if (loyalty && offer.regularPrice !== null && offer.regularPrice > offer.price) {
    return { price: offer.regularPrice, loyaltyPrice: offer.price };
  }
  return { price: offer.price, loyaltyPrice: null };
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

/**
 * Правилата по име на типот: `require` во `name`, `exclude` ни во `name` ни во `context`.
 * Кај синџир без категории (КАМ) „име" е името и описот, бидејќи името е скратено
 * („ЧОКОЛ.МЛЕЧНО АЛПИКО 100ГР"), а описот го носи видот („ALPIKO ЧОКОЛАДО МЛЕЧНО").
 */
export function passesNameRules(type: ProductType, name: string, context = ""): boolean {
  if (type.require && !type.require.test(name)) return false;
  if (type.exclude?.test(`${name} | ${context}`)) return false;
  return true;
}

/**
 * Текстот врз кој се проверуваат правилата по име. Кај синџир без категории и
 * латиничните „двојници" стануваат кирилични, исто како во предлозите (propose.ts).
 */
export function ruleText(offer: Offer, byProduct: boolean): string {
  if (!byProduct) return offer.name.toUpperCase();
  return `${normalizeLookalikes(offer.name)} | ${normalizeLookalikes(offer.description)}`;
}

/** Дали редот од ценовникот е од дадениот тип (без да се гледа количината). */
export function matchesType(offer: Offer, chain: string, type: ProductType, maps: TypeMaps = defaultTypeMaps()): boolean {
  if (!reviewedTypes(maps, chain, offer)?.includes(type.id)) return false;
  return passesNameRules(type, ruleText(offer, mapsByProduct(maps, chain)), offer.category.toUpperCase());
}

export function findCandidates(store: SnapshotFile, type: ProductType, maps: TypeMaps = defaultTypeMaps()): Candidate[] {
  const candidates: Candidate[] = [];
  for (const offer of store.offers) {
    if (!matchesType(offer, store.chain, type, maps)) continue;
    const pack = resolvePack(offer, type);
    if (!pack) continue;
    const brand = maps.brands && brandOf(offer, type.id, maps.brands);
    candidates.push(brand ? { offer, ...pack, brand } : { offer, ...pack });
  }
  return candidates;
}

function purchase(candidate: Candidate, need: number): Purchase {
  const { price, loyaltyPrice } = comparisonPrice(candidate.offer);
  if (candidate.divisible) {
    return { ...candidate, price, loyaltyPrice, packs: 1, amount: need, cost: Math.round(price * need) };
  }
  const packs = Math.max(1, Math.ceil((need * (1 - SIZE_TOLERANCE)) / candidate.packAmount - 1e-9));
  return { ...candidate, price, loyaltyPrice, packs, amount: packs * candidate.packAmount, cost: packs * price };
}

/** Најевтиниот начин да се купи `need` од дадениот тип во една продавница. */
export function cheapestPurchase(
  store: SnapshotFile,
  type: ProductType,
  need: number,
  maps: TypeMaps = defaultTypeMaps(),
): Purchase | null {
  return cheapestFromCandidates(findCandidates(store, type, maps), need);
}

/** Најевтиното купување од веќе најдени кандидати (на телефонот: од пакетот со цени). */
export function cheapestFromCandidates(candidates: Candidate[], need: number): Purchase | null {
  let best: Purchase | null = null;
  for (const candidate of candidates) {
    const p = purchase(candidate, need);
    if (p.packs > MAX_PACKS) continue;
    // При иста сума, подобро е пакувањето што дава повеќе.
    if (!best || p.cost < best.cost || (p.cost === best.cost && p.amount > best.amount)) best = p;
  }
  return best;
}
