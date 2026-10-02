// Правење на пакетот за телефонот од целосната историја (секое утро, по преземањето).

import type { ProductType } from "../catalog.ts";
import { isStale } from "../freshness.ts";
import { prepareStore, type PricePoint, type StoreHistory } from "../history.ts";
import { comparisonPrice, findCandidates } from "../match.ts";
import type { TypeMaps } from "../type-maps.ts";
import { BUNDLE_VERSION, type BundleCandidate, type BundlePoint, type PriceBundle } from "./bundle.ts";

function toBundlePoint(p: PricePoint): BundlePoint {
  const comparable = p.comparable === undefined ? p.price : p.comparable;
  if (p.added) return [p.date, p.price, comparable, 1];
  return comparable !== p.price ? [p.date, p.price, comparable] : [p.date, p.price];
}

export function buildBundle(histories: StoreHistory[], types: ProductType[], maps: TypeMaps, date: string): PriceBundle {
  const prepared = histories.map((h) => prepareStore(h, (known, type) => findCandidates(known, type, maps)));

  const bundleTypes: PriceBundle["types"] = {};
  for (const type of types) {
    const byStore: Record<string, BundleCandidate[]> = {};
    for (const [i, store] of prepared.entries()) {
      const list = store.candidates(type).map((c): BundleCandidate => {
        const o = c.offer;
        const entry: BundleCandidate = { n: o.name, p: o.price, a: c.packAmount };
        if (o.regularPrice !== null) entry.r = o.regularPrice;
        if (o.promoKind) entry.k = o.promoKind;
        if (o.promoUntil) entry.u = o.promoUntil;
        if (c.divisible) entry.d = 1;
        if (!store.isCurrent(o.name)) entry.g = 1;

        // Без историја кога е само денешната цена (најчестиот случај): ја гради телефонот.
        const series = store.seriesOf(o.name);
        const onlyToday =
          series.length === 1 &&
          series[0].date === histories[i].date &&
          series[0].price === o.price &&
          !series[0].added &&
          (series[0].comparable ?? o.price) === comparisonPrice(o).price;
        if (!onlyToday) entry.s = series.map(toBundlePoint);
        return entry;
      });
      if (list.length) byStore[store.snapshot.storeId] = list;
    }
    bundleTypes[type.id] = byStore;
  }

  return {
    version: BUNDLE_VERSION,
    date,
    stores: histories.map((h, i) => ({
      id: h.snapshot.storeId,
      chain: h.snapshot.chain,
      label: h.snapshot.label,
      city: h.snapshot.city,
      date: h.date,
      updatedAt: h.snapshot.updatedAt,
      fetchedAt: h.snapshot.fetchedAt,
      count: h.snapshot.offers.length,
      stale: isStale(h.snapshot),
      start: prepared[i].start,
    })),
    types: bundleTypes,
  };
}
