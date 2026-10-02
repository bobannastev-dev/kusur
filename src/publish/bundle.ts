// Пакетот со цени за телефонот (public/data/types.json) и читањето на телефонот.
// Наместо целосните ценовници (~8 MB), само кандидатите по тип производ и продавница,
// со историјата на нивните цени — доволно за кошничката, поевтинетото и акциите.
// Овој модул се вчитува во прелистувач: без Node модули (browser-safe.test.ts).

import type { ProductType } from "../catalog.ts";
import type { PreparedStore, PricePoint } from "../history.ts";
import { comparisonPrice, type Candidate } from "../match.ts";
import type { Offer, SnapshotFile } from "../types.ts";

export const BUNDLE_VERSION = 1;

export interface BundleStore {
  id: string;
  chain: string;
  label: string;
  city: string;
  /** Датумот на снимката (преземање). */
  date: string;
  /** Кога маркетот го ажурирал ценовникот, како што го објавил. */
  updatedAt: string | null;
  fetchedAt: string;
  /** Колку производи има ценовникот. */
  count: number;
  /** Маркетот не го ажурирал ценовникот повеќе од 2 дена. */
  stale: boolean;
  /** Првиот ден со податоци за историјата. */
  start: string;
}

/** Точка во историјата: [датум, цена, цена без картичка ако е друга, 1 ако е навистина нов]. */
export type BundlePoint = [string, number | null] | [string, number | null, number | null] | [string, number | null, number | null, 1];

/** Кандидат со кратки клучеви (пакетот се праќа на телефон). */
export interface BundleCandidate {
  /** име */ n: string;
  /** цена */ p: number;
  /** редовна цена */ r?: number;
  /** вид на акција */ k?: string;
  /** траење на акцијата */ u?: string;
  /** количина на пакувањето */ a: number;
  /** на мерење */ d?: 1;
  /** исчезнат: го нема денес, само за „тогаш" */ g?: 1;
  /** историја; без неа: само денешната цена */ s?: BundlePoint[];
}

export interface PriceBundle {
  version: number;
  /** Датумот на пакетот (најновата снимка). */
  date: string;
  stores: BundleStore[];
  /** тип → продавница → кандидати */
  types: Record<string, Record<string, BundleCandidate[]>>;
}

export function toOffer(c: BundleCandidate): Offer {
  return {
    name: c.n,
    price: c.p,
    regularPrice: c.r ?? null,
    unitPriceText: "",
    category: "",
    description: "",
    promoKind: c.k ?? null,
    promoUntil: c.u ?? null,
  };
}

export function toPoints(points: BundlePoint[]): PricePoint[] {
  return points.map(([date, price, comparable, added]) => ({
    date,
    price,
    comparable: comparable === undefined ? price : comparable,
    ...(added === 1 ? { added: true } : {}),
  }));
}

export interface BundleView {
  bundle: PriceBundle;
  /** Продавниците како снимки без редови (за `compareBasketWith`). */
  stores: SnapshotFile[];
  /** Денешните кандидати (без исчезнатите). */
  candidatesFor: (store: SnapshotFile, type: ProductType) => Candidate[];
  /** За `dropsFrom`. */
  prepared: PreparedStore[];
  seriesOf: (storeId: string, name: string) => PricePoint[];
  start: (storeId: string) => string;
}

/** Читање на пакетот на телефонот. */
export function fromBundle(bundle: PriceBundle): BundleView {
  if (bundle.version !== BUNDLE_VERSION) throw new Error(`Непозната верзија на пакетот: ${bundle.version}`);

  const stores: SnapshotFile[] = bundle.stores.map((s) => ({
    storeId: s.id, chain: s.chain, label: s.label, city: s.city, fetchedAt: s.fetchedAt, updatedAt: s.updatedAt, offers: [],
  }));
  const meta = new Map(bundle.stores.map((s) => [s.id, s]));

  // Секој кандидат се претвора еднаш, на првото барање на типот.
  const cache = new Map<string, Map<string, { candidate: Candidate; gone: boolean; series: PricePoint[] }[]>>();
  const entries = (typeId: string) => {
    let byStore = cache.get(typeId);
    if (byStore) return byStore;
    byStore = new Map();
    for (const [storeId, list] of Object.entries(bundle.types[typeId] ?? {})) {
      const date = meta.get(storeId)?.date ?? bundle.date;
      byStore.set(
        storeId,
        list.map((c) => {
          const offer = toOffer(c);
          const series = c.s ? toPoints(c.s) : [{ date, price: c.p, comparable: comparisonPrice(offer).price }];
          return { candidate: { offer, packAmount: c.a, divisible: c.d === 1 }, gone: c.g === 1, series };
        }),
      );
    }
    cache.set(typeId, byStore);
    return byStore;
  };

  // Серија по име: од кој било тип каде производот е кандидат.
  const seriesOf = (storeId: string, name: string): PricePoint[] => {
    for (const typeId of Object.keys(bundle.types)) {
      const found = entries(typeId).get(storeId)?.find((e) => e.candidate.offer.name === name);
      if (found) return found.series;
    }
    return [];
  };

  return {
    bundle,
    stores,
    candidatesFor: (store, type) => (entries(type.id).get(store.storeId) ?? []).filter((e) => !e.gone).map((e) => e.candidate),
    prepared: stores.map((snapshot) => ({
      snapshot,
      start: meta.get(snapshot.storeId)!.start,
      seriesOf: (name) => seriesOf(snapshot.storeId, name),
      isCurrent: (name) => {
        for (const typeId of Object.keys(bundle.types)) {
          const found = entries(typeId).get(snapshot.storeId)?.find((e) => e.candidate.offer.name === name);
          if (found) return !found.gone;
        }
        return false;
      },
      candidates: (type) => (entries(type.id).get(snapshot.storeId) ?? []).map((e) => e.candidate),
    })),
    seriesOf,
    start: (storeId) => meta.get(storeId)?.start ?? bundle.date,
  };
}
