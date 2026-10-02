// Промени на цените меѓу две снимки од иста продавница: основа за историјата
// и за „поевтини". Клуч е името на производот како што го пишува маркетот.

import type { Offer } from "./types.ts";

export interface PriceChange {
  name: string;
  oldPrice: number;
  newPrice: number;
  /** Новиот ред од ценовникот (редовна цена, акција, единечна цена). */
  offer: Offer;
  /** Стариот ред (за цената без клуб-картичка); записите пред 2026-10-03 го немаат. */
  oldOffer?: Offer;
}

export interface OfferDiff {
  added: Offer[];
  removed: Offer[];
  changed: PriceChange[];
  /** Имиња што се појавуваат повеќе пати во новата снимка (се зема првиот ред). */
  duplicates: string[];
}

function byName(offers: Offer[]): { map: Map<string, Offer>; duplicates: string[] } {
  const map = new Map<string, Offer>();
  const duplicates = new Set<string>();
  for (const offer of offers) {
    if (map.has(offer.name)) duplicates.add(offer.name);
    else map.set(offer.name, offer);
  }
  return { map, duplicates: [...duplicates] };
}

/** `prev` е null за првата снимка на продавницата. Промена е само друга продажна цена. */
export function diffOffers(prev: Offer[] | null, next: Offer[]): OfferDiff {
  const before = byName(prev ?? []).map;
  const { map: after, duplicates } = byName(next);

  const added: Offer[] = [];
  const changed: PriceChange[] = [];
  for (const [name, offer] of after) {
    const old = before.get(name);
    if (!old) added.push(offer);
    else if (old.price !== offer.price) changed.push({ name, oldPrice: old.price, newPrice: offer.price, offer, oldOffer: old });
  }
  const removed = [...before.values()].filter((o) => !after.has(o.name));

  return { added, removed, changed, duplicates };
}
