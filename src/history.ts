// Историја на цените од дневните промени (ChangesRecord): колку чинел производот
// кој било ден. Чисти функции — читањето од PriceStore е во командите.

import type { ProductType } from "./catalog.ts";
import { comparisonPrice, findCandidates, type Candidate } from "./match.ts";
import type { ChangesRecord } from "./price-store.ts";
import { TYPE_MAPS, type TypeMaps } from "./type-maps.ts";
import type { Offer, SnapshotFile } from "./types.ts";

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
 * Серии на цени за сите производи на една продавница, со едно поминување низ промените.
 * `changes` се записите на таа продавница; `current` е нејзината најнова снимка.
 */
export function allSeries(changes: ChangesRecord[], current: { date: string; offers: Offer[] }): Map<string, PricePoint[]> {
  const byName = new Map<string, Map<string, { point: PricePoint; weight: number }>>();
  const put = (name: string, point: PricePoint, weight: number) => {
    let points = byName.get(name);
    if (!points) byName.set(name, (points = new Map()));
    const existing = points.get(point.date);
    if (!existing || weight >= existing.weight) points.set(point.date, { point, weight });
  };

  for (const r of [...changes].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const o of r.added) put(o.name, { date: r.date, price: o.price, added: true }, WEIGHT.sameDay);
    for (const c of r.changed) {
      if (r.prevDate) put(c.name, { date: r.prevDate, price: c.oldPrice }, WEIGHT.previous);
      put(c.name, { date: r.date, price: c.newPrice }, WEIGHT.sameDay);
    }
    for (const o of r.removed) {
      if (r.prevDate) put(o.name, { date: r.prevDate, price: o.price }, WEIGHT.previous);
      put(o.name, { date: r.date, price: null }, WEIGHT.sameDay);
    }
  }
  for (const o of current.offers) put(o.name, { date: current.date, price: o.price }, WEIGHT.current);

  return new Map(
    [...byName].map(([name, points]) => [name, [...points.values()].map((p) => p.point).sort((a, b) => a.date.localeCompare(b.date))]),
  );
}

/** Серија на цени за еден производ во една продавница. */
export function priceSeries(changes: ChangesRecord[], current: { date: string; offer: Offer | undefined }, name: string): PricePoint[] {
  return allSeries(changes, { date: current.date, offers: current.offer ? [current.offer] : [] }).get(name) ?? [];
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

// ── Поевтинето од датум ──

/** Колку мора да падне цената за да се смета за поевтинување. */
export const DROP_THRESHOLD = 0.05;

/** Една продавница: најновата снимка и нејзините промени. */
export interface StoreHistory {
  date: string;
  snapshot: SnapshotFile;
  changes: ChangesRecord[];
}

export interface Drop {
  store: SnapshotFile;
  /** Денешниот ред од ценовникот. */
  offer: Offer;
  oldPrice: number;
  /** Денешната цена за споредба (без клуб-картичка). */
  newPrice: number;
}

export interface UnitBest {
  store: SnapshotFile;
  offer: Offer;
  /** Цена по единица на типот (ден/кг, ден/л, ден/парче). */
  unitPrice: number;
}

export interface TypeDrops {
  type: ProductType;
  /** Датумот со кој е споредено (може да е подоцна од бараниот, види `sinceAdjusted`). */
  since: string;
  sinceAdjusted: boolean;
  drops: Drop[];
  cheapest: { then: UnitBest | null; now: UnitBest | null; dropped: boolean };
}

/** Првиот ден за кој продавницата има податоци. */
export function historyStart(h: StoreHistory): string {
  return h.changes.reduce((min, r) => {
    const d = r.prevDate ?? r.date;
    return d < min ? d : min;
  }, h.date);
}

const isDrop = (oldPrice: number, newPrice: number) => newPrice <= oldPrice * (1 - DROP_THRESHOLD) + 1e-9;

const unitOf = (c: Candidate, price: number) => Number((price / c.packAmount).toFixed(2));

function cheaper(a: UnitBest | null, b: UnitBest): UnitBest {
  return !a || b.unitPrice < a.unitPrice ? b : a;
}

/**
 * За секој тип: производите поевтинети за најмалку 5% од `since` до денес, и
 * најевтиното по единица тогаш и денес. Количината на пакувањето е од денешниот
 * ред (или последниот познат за производ што исчезнал) — историската цена се
 * дели со неа, бидејќи единечната цена во ценовникот важи за денешната цена.
 */
export function dropsSince(stores: StoreHistory[], types: ProductType[], since: string, maps: TypeMaps = TYPE_MAPS): TypeDrops[] {
  const start = stores.map(historyStart).sort()[0] ?? since;
  const effective = since < start ? start : since;

  const prepared = stores.map((h) => {
    const series = allSeries(h.changes, { date: h.date, offers: h.snapshot.offers });
    const current = new Set(h.snapshot.offers.map((o) => o.name));
    // Исчезнатите производи (последниот познат ред) учествуваат само во „тогаш".
    const gone = new Map<string, Offer>();
    for (const r of h.changes) for (const o of r.removed) if (!current.has(o.name)) gone.set(o.name, o);
    const known: SnapshotFile = { ...h.snapshot, offers: [...h.snapshot.offers, ...gone.values()] };
    return { h, series, current, known };
  });

  return types.map((type) => {
    const drops: Drop[] = [];
    let then: UnitBest | null = null;
    let now: UnitBest | null = null;

    for (const { h, series, current, known } of prepared) {
      for (const c of findCandidates(known, type, maps)) {
        const oldPrice = priceOn(series.get(c.offer.name) ?? [], effective);
        if (oldPrice !== null) then = cheaper(then, { store: h.snapshot, offer: c.offer, unitPrice: unitOf(c, oldPrice) });
        if (!current.has(c.offer.name)) continue;

        const newPrice = comparisonPrice(c.offer).price;
        now = cheaper(now, { store: h.snapshot, offer: c.offer, unitPrice: unitOf(c, newPrice) });
        if (oldPrice !== null && isDrop(oldPrice, newPrice)) drops.push({ store: h.snapshot, offer: c.offer, oldPrice, newPrice });
      }
    }

    const dropped = then !== null && now !== null && isDrop(then.unitPrice, now.unitPrice);
    return { type, since: effective, sinceAdjusted: effective !== since, drops, cheapest: { then, now, dropped } };
  });
}

// ── Вистинска акција ──

/** Колку дена пред акцијата се гледа најниската цена (како правилото на ЕУ за попусти). */
export const PROMO_LOOKBACK_DAYS = 30;

export type PromoVerdict =
  /** Акциската цена е пониска од најниската во 30-те дена пред акцијата. */
  | "genuine"
  /** Во 30-те дена пред акцијата цената била иста или пониска. */
  | "not-lower"
  /** Објавената редовна цена е повисока од најниската во 30-те дена пред акцијата. */
  | "regular-raised"
  /** Помалку од 30 дена податоци пред акцијата. */
  | "insufficient"
  | "not-on-promo";

export interface PromoCheck {
  verdict: PromoVerdict;
  /** Првиот ден со сегашната акциска цена (во последниот непрекинат период). */
  promoStart: string | null;
  /** Најниската цена во 30-те дена пред почетокот; null ако нема податоци. */
  lowestBefore: number | null;
  /** Акцијата важи само со клуб-картичка. */
  loyalty: boolean;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Почетокот на последниот непрекинат период со дадената цена. */
function runStart(series: PricePoint[], price: number): string | null {
  let start: string | null = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].price !== price) break;
    start = series[i].date;
  }
  return start;
}

/**
 * Дали акцијата е вистинска. `historyStart` е првиот ден за кој продавницата има
 * податоци: пред него не знаеме колку чинел производот.
 */
export function promoCheck(offer: Offer, series: PricePoint[], historyStart: string): PromoCheck {
  const loyalty = comparisonPrice(offer).loyaltyPrice !== null;
  const onPromo = (offer.regularPrice !== null && offer.price < offer.regularPrice) || offer.promoKind != null;
  if (!onPromo) return { verdict: "not-on-promo", promoStart: null, lowestBefore: null, loyalty };

  const promoStart = runStart(series, offer.price);
  // Истата цена уште од почетокот на историјата (не била „додадена" подоцна): акцијата
  // почнала некогаш пред тоа. Ако тоа е барем 30 дена, цената не е пониска од 30-те дена пред.
  if (promoStart === series[0]?.date && !series[0].added) {
    const lastDate = series[series.length - 1].date;
    const longEnough = historyStart <= addDays(lastDate, -PROMO_LOOKBACK_DAYS);
    return { verdict: longEnough ? "not-lower" : "insufficient", promoStart: historyStart, lowestBefore: longEnough ? offer.price : null, loyalty };
  }
  const windowStart = promoStart && addDays(promoStart, -PROMO_LOOKBACK_DAYS);
  if (!promoStart || !windowStart || windowStart < historyStart) {
    return { verdict: "insufficient", promoStart, lowestBefore: null, loyalty };
  }

  let lowestBefore: number | null = null;
  for (let day = windowStart; day < promoStart; day = addDays(day, 1)) {
    const price = priceOn(series, day);
    if (price !== null && (lowestBefore === null || price < lowestBefore)) lowestBefore = price;
  }

  const verdict: PromoVerdict =
    lowestBefore === null
      ? "insufficient"
      : offer.price >= lowestBefore
        ? "not-lower"
        : offer.regularPrice !== null && offer.regularPrice > lowestBefore
          ? "regular-raised"
          : "genuine";
  return { verdict, promoStart, lowestBefore, loyalty };
}

/** Пресудата за акција со зборови, за командите и (подоцна) веб-апликацијата. */
export const PROMO_VERDICT_TEXT: Record<PromoVerdict, string> = {
  genuine: "вистинска акција (пониско од најниската цена во 30-те дена пред неа)",
  "not-lower": "не е пониско — во 30-те дена пред акцијата чинело исто или помалку",
  "regular-raised": "редовната цена е кренана пред попустот",
  insufficient: "нема доволно историја (помалку од 30 дена)",
  "not-on-promo": "не е на акција",
};
