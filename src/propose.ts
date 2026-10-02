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
import type { Offer } from "./types.ts";

export interface Proposal {
  types: string[];
  /** Првиот збор во описот кажува дека не е храна ни хигиена (облека, садови, цигари…). */
  nonFood: boolean;
}

// Латинични букви што изгледаат како кирилични („ПИЈАЛAК" со латинско A).
const LOOKALIKES: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У", J: "Ј" };
const CYRILLIC = /[Ѐ-ӿ]/;

function normalize(text: string): string[] {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (CYRILLIC.test(w) ? w.replace(/[ABCEHKMOPTXYJ]/g, (c) => LOOKALIKES[c]) : w));
}

/** Описот без марката на латиница на почетокот. */
function head(description: string): string[] {
  const words = normalize(description);
  const start = words.findIndex((w) => CYRILLIC.test(w));
  return start === -1 ? [] : words.slice(start);
}

function keywordOf(type: ProductType): RegExp | null {
  if (KEYWORDS[type.id]) return KEYWORDS[type.id];
  return type.require ? new RegExp(`^(?:${type.require.source})`, type.require.flags) : null;
}

export function proposeTypes(offer: Offer): Proposal {
  const words = head(offer.description);
  if (words.length && NON_FOOD.test(words.join(" "))) return { types: [], nonFood: true };

  const rules = ruleText({ ...offer, description: normalize(offer.description).join(" ") }, true);
  const tries = /^СОРТ/.test(words[0] ?? "") ? [] : [0, 1, 2].map((skip) => words.slice(skip).join(" ")).filter(Boolean);
  tries.push(normalize(offer.name).join(" "));

  for (const text of tries) {
    const types = CATALOG.filter((t) => keywordOf(t)?.test(text) && passesNameRules(t, rules)).map((t) => t.id);
    if (types.length) return { types, nonFood: false };
  }
  return { types: [], nonFood: false };
}
