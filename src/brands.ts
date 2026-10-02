// Брендови (data/brands.json): кој бренд е редот од ценовникот, за ставки „само Персил"
// или „само Nescafé". Рачно прегледан фајл, како мапите: шаблоните (кирилица и латиница)
// важат само за наведените типови, бидејќи ист збор во друг тип може да значи друго.
// Брендот се пресметува при build-data и оди во пакетот; телефонот не ги носи шаблоните.

import { normalizeLookalikes } from "./parse.ts";
import type { Offer } from "./types.ts";

export interface Brand {
  /** Име за приказ („Nescafé"). */
  label: string;
  /** Шаблони (RegExp, големи букви) што се бараат на почеток на збор во името и описот. */
  patterns: string[];
  /** Типовите за кои брендот важи. */
  types: string[];
  /** Зборови во списокот на купувачот што значат „овој тип, овој бренд" („нескафе"). */
  aliases?: string[];
}

export type Brands = Record<string, Brand>;

const compiled = new WeakMap<Brand, RegExp>();

/** Шаблоните на брендот како еден израз: само на почеток на збор („НЕС" не во „ВЕЛНЕС"). */
export function brandPattern(brand: Brand): RegExp {
  let re = compiled.get(brand);
  if (!re) {
    re = new RegExp(`(?<![\\p{L}\\d])(?:${brand.patterns.join("|")})`, "u");
    compiled.set(brand, re);
  }
  return re;
}

/** Текстот во кој се бара брендот: име и опис (кај КАМ брендот е често само во описот). */
export function brandText(offer: Pick<Offer, "name" | "description">): string {
  return `${normalizeLookalikes(offer.name)} | ${normalizeLookalikes(offer.description)}`;
}

/**
 * Брендот на редот за дадениот тип, или null. Ако се најдат повеќе брендови
 * („ЧОКОЛАДО МИЛКА СО ОРЕО"), победува оној што е порано во текстот.
 */
export function brandOf(offer: Pick<Offer, "name" | "description">, typeId: string, brands: Brands): string | null {
  const text = brandText(offer);
  let best: { id: string; index: number } | null = null;
  for (const [id, brand] of Object.entries(brands)) {
    if (!brand.types.includes(typeId)) continue;
    const index = text.search(brandPattern(brand));
    if (index >= 0 && (!best || index < best.index)) best = { id, index };
  }
  return best?.id ?? null;
}

/**
 * Грешки во фајлот: непознат тип, празни или неважечки шаблони, ист алијас кај два бренда,
 * и шаблони што се преклопуваат — името или шаблон на еден бренд го препознава друг бренд
 * на ист тип (на пр. „НЕС" и „НЕСКАФЕ").
 */
export function brandErrors(brands: Brands, typeIds: Set<string>): string[] {
  const errors: string[] = [];
  const aliasOwner = new Map<string, string>();
  for (const [id, brand] of Object.entries(brands)) {
    if (!/^[a-z0-9-]+$/.test(id)) errors.push(`${id}: ид само со мали латинични букви, бројки и „-"`);
    if (!brand.label?.trim()) errors.push(`${id}: нема име`);
    if (!brand.patterns?.length) errors.push(`${id}: нема шаблони`);
    if (!brand.types?.length) errors.push(`${id}: нема типови`);
    for (const t of brand.types ?? []) if (!typeIds.has(t)) errors.push(`${id}: непознат тип ${t}`);
    for (const p of brand.patterns ?? []) {
      const letters = p.replace(/\\[pP]\{[^}]*\}/g, "");
      if (letters !== letters.toUpperCase()) errors.push(`${id}: шаблонот „${p}" не е со големи букви`);
      try {
        new RegExp(p, "u");
      } catch {
        errors.push(`${id}: неважечки шаблон „${p}"`);
      }
    }
    for (const a of brand.aliases ?? []) {
      const prev = aliasOwner.get(a);
      if (prev) errors.push(`алијасот „${a}" е и кај ${prev} и кај ${id}`);
      aliasOwner.set(a, id);
    }
  }
  if (errors.length) return errors;

  const entries = Object.entries(brands);
  for (const [i, [aId, a]] of entries.entries()) {
    for (const [bId, b] of entries.slice(i + 1)) {
      if (!a.types.some((t) => b.types.includes(t))) continue;
      const samples = (x: Brand) => [x.label.toUpperCase(), ...x.patterns.filter((p) => /^[\p{L}\d .'-]+$/u.test(p))];
      if (samples(a).some((s) => brandPattern(b).test(s)) || samples(b).some((s) => brandPattern(a).test(s))) {
        errors.push(`${aId} и ${bId} се преклопуваат на ист тип`);
      }
    }
  }
  return errors;
}
