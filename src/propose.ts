// Предлози на тип за производи на синџир без категории (КАМ). Само предлог:
// во data/product-map.json влегува по преглед (npm run propose → data/review/).
//
// Описот е „МАРКА + вид производ": „BELLA FARM МЛЕКО ТРАЈНО 1.5%". Марката (латиница)
// се отсекува, па клучните зборови се бараат на почетокот на остатокот. Ако таму нема
// ништо, се прескокнуваат еден-два збора (марка на кирилица: „ОСОГОВО КАШКАВАЛ"),
// а на крај се гледа името (свежо овошје: описот е само „СОРТА: …").

import { CATALOG, type ProductType } from "./catalog.ts";
import { KEYWORDS, NON_FOOD } from "./keywords.ts";
import { passesNameRules, ruleText } from "./match.ts";
import { CYRILLIC, normalizeLookalikes } from "./parse.ts";
import type { Offer } from "./types.ts";

export interface Proposal {
  types: string[];
  /** Првиот збор во описот кажува дека не е храна ни хигиена (облека, садови, цигари…). */
  nonFood: boolean;
}

const words = (text: string) => normalizeLookalikes(text).split(" ").filter(Boolean);

/** Описот без марката на латиница на почетокот. */
function head(description: string): string[] {
  const all = words(description);
  const start = all.findIndex((w) => CYRILLIC.test(w));
  return start === -1 ? [] : all.slice(start);
}

function keywordOf(type: ProductType): RegExp | null {
  if (KEYWORDS[type.id]) return KEYWORDS[type.id];
  return type.require ? new RegExp(`^(?:${type.require.source})`, type.require.flags) : null;
}

export function proposeTypes(offer: Offer): Proposal {
  const described = head(offer.description);
  if (described.length && NON_FOOD.test(described.join(" "))) return { types: [], nonFood: true };

  const rules = ruleText(offer, true);
  const tries = /^СОРТ/.test(described[0] ?? "") ? [] : [0, 1, 2].map((skip) => described.slice(skip).join(" ")).filter(Boolean);
  tries.push(normalizeLookalikes(offer.name));

  for (const text of tries) {
    const types = CATALOG.filter((t) => keywordOf(t)?.test(text) && passesNameRules(t, rules)).map((t) => t.id);
    if (types.length) return { types, nonFood: false };
  }
  return { types: [], nonFood: false };
}
