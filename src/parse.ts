import type { Unit } from "./types.ts";

/**
 * Претвора текстуална цена во број: „279 ден." -> 279, „1.250,50" -> 1250.5.
 * Денарските цени се главно цели броеви, но единечните цени имаат децимали.
 */
export function parsePrice(text: string): number | null {
  const match = /\d[\d.,]*/.exec(text);
  if (!match) return null;
  let num = match[0].replace(/[.,]+$/, "");

  if (num.includes(",") && num.includes(".")) {
    // „1.250,50" -> точката е за илјади, запирката е децимала.
    num = num.replaceAll(".", "").replace(",", ".");
  } else if (num.includes(",")) {
    // 1-2 цифри по запирката = децимала; инаку разделувач на илјади.
    num = /,\d{1,2}$/.test(num) ? num.replace(",", ".") : num.replaceAll(",", "");
  } else if (/\.\d{3}$/.test(num) || num.split(".").length > 2) {
    // „1.250" -> точката е разделувач на илјади, не децимала.
    num = num.replaceAll(".", "");
  }

  const value = Number(num);
  return Number.isFinite(value) ? value : null;
}

// Маркетите ги пишуваат единиците и на кирилица и на латиница, со и без точка.
const UNIT_ALIASES: Array<[RegExp, Unit, number]> = [
  // [образец, основна единица, множител до основната единица]
  [/^(кг|кгр|kg)$/, "kg", 1],
  [/^(г|гр|g|gr)$/, "kg", 0.001],
  [/^(л|лит|l|lit)$/, "l", 1],
  [/^(мл|ml)$/, "l", 0.001],
  [/^(ком|парче|пар|бр|par|kom|pcs)$/, "pc", 1],
];

function toBaseUnit(rawUnit: string): { unit: Unit; factor: number } | null {
  const u = rawUnit.toLowerCase().replace(/[.:]+$/, "");
  for (const [re, unit, factor] of UNIT_ALIASES) {
    if (re.test(u)) return { unit, factor };
  }
  return null;
}

const decimal = (s: string) => Number(s.replace(",", "."));
// 470 * 0.001 дава 0.47000000000000003 — резултатите од множење со факторот ги заокружуваме.
const tidy = (n: number) => Number(n.toFixed(6));

/**
 * Единечна цена како што ја објавува маркетот, сведена на основна единица:
 * „1кгр = 142.00 ден." -> 142 ден/кг · „100 МЛ: =7.9ДЕН" -> 79 ден/л.
 */
export function parseUnitPrice(text: string): { unit: Unit; price: number } | null {
  const match = /(\d+(?:[.,]\d+)?)\s*([^\s=\d]+)\s*=\s*(\d[\d.,]*)/.exec(text);
  if (!match) return null;
  const amount = decimal(match[1]);
  const base = toBaseUnit(match[2]);
  const price = parsePrice(match[3]);
  if (!base || price === null || !(amount > 0)) return null;
  return { unit: base.unit, price: tidy(price / (amount * base.factor)) };
}

// „гр", „кг" се читаат и кога маркетот ги слепил со следниот збор, но само залепени и за
// бројот („500грЛУТИ"; не „РВ6 ГРИМИЗНА");
// еднобуквените „г", „л" и „мл" (почеток на „МЛЕКО") само како посебен збор: „+3ГОД" не е 3 г;
// „гр" не е почеток на „ГРАТИС" („5+1ГРАТИС").
const MEASURE = String.raw`((?<=\d)(?:кгр|кг|kg|гр(?!ат))(?=\p{L})|(?:кгр|кг|kg|гр|г|g|мл|ml|лит|л|l)(?!\p{L}))`;
const MULTI_PACK_RE = new RegExp(String.raw`(\d+)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*${MEASURE}`, "u");
const SINGLE_RE = new RegExp(String.raw`(\d+(?:[.,]\d+)?)\s*${MEASURE}`, "u");
const PIECES_RE = /(\d+)\s*ком/u;
const PACK_RATIO_RE = /(\d+)\s*\/\s*(\d+)/u;
// „16рол … 3/1" = 3 пакувања по 16 ролни („РОЛЕТИ" е марка, не број).
const ROLLS_RE = /(\d+)\s*рол(?:ни)?(?!\p{L})/u;
// „8+2/1" и „8/1+2" = 10 парчиња; „/1" не е дел од збирот. Само без празни места:
// „ПЕЛЕНИ БР.6 15+ 40/1" е 40 пелени за 15+ кг, „2/1 +3ГОД" е 2 четки за 3+ години.
const PLUS_PER_ONE_RE = /(?<![\d.,])(\d{1,2})(?:\+(\d{1,2})\/1|\/1\+(\d{1,2}))(?!\d)/u;
// „30/Л" = 30 јајца од класа Л.
const PACK_CLASS_RE = /(\d+)\s*\/\s*(?:хл|xl|л|м|с|l|m|s)(?!\p{L})/u;
// „5+1", „8+2", „3+1х90гр" = толку парчиња во пакувањето (не „300мл+300мл").
const PLUS_RE = new RegExp(String.raw`(?<![\d.,])(\d{1,2})\s*\+\s*(\d{1,2})(?!\d|\s*${MEASURE})`, "u");

function plusCount(n: string): number | null {
  const m = PLUS_RE.exec(n);
  if (!m) return null;
  const total = Number(m[1]) + Number(m[2]);
  return total >= 2 && total <= 200 ? total : null;
}

/**
 * Количина на едно пакување, прочитана од името на производот, во основна единица.
 * `units` кажува што бараме: тежина/волумен („МЛЕКО 1Л", „КАФЕ 200гр", мулти-пак „6x1л")
 * или парчиња („ЈАЈЦА 10/1", „1/10", „30 ком").
 */
export function parseQuantity(name: string, units: Unit[]): { unit: Unit; amount: number } | null {
  const n = name.toLowerCase();

  if (units.includes("kg") || units.includes("l")) {
    const multi = MULTI_PACK_RE.exec(n);
    const multiBase = multi && toBaseUnit(multi[3]);
    // „3+1х90гр": бројот пред „х" е дел од „3+1", па множителот е 4, не 1.
    const plus = plusCount(n);
    if (multi && multiBase && units.includes(multiBase.unit)) {
      const count = Number(multi[1]) === 1 && plus ? plus : Number(multi[1]);
      return { unit: multiBase.unit, amount: tidy(count * decimal(multi[2]) * multiBase.factor) };
    }

    const single = SINGLE_RE.exec(n);
    const singleBase = single && toBaseUnit(single[2]);
    if (single && singleBase && units.includes(singleBase.unit)) {
      return { unit: singleBase.unit, amount: tidy((plus ?? 1) * decimal(single[1]) * singleBase.factor) };
    }
  }

  if (units.includes("pc")) {
    const pieces = PIECES_RE.exec(n);
    if (pieces) return { unit: "pc", amount: Number(pieces[1]) };

    const plusPerOne = PLUS_PER_ONE_RE.exec(n);
    if (plusPerOne) return { unit: "pc", amount: Number(plusPerOne[1]) + Number(plusPerOne[2] ?? plusPerOne[3]) };

    const ratio = PACK_RATIO_RE.exec(n);
    const rolls = ROLLS_RE.exec(n);
    // „16рол 3/1" = 3 пакувања по 16; „2рол 1/10" е однос „1/N" и го чита долу.
    const oneToMany = ratio && Number(ratio[1]) === 1 && Number(ratio[2]) > 1;
    if (rolls && !oneToMany) {
      const packs = ratio && Number(ratio[2]) === 1 ? Number(ratio[1]) : 1;
      return { unit: "pc", amount: packs * Number(rolls[1]) };
    }
    if (ratio) {
      const [a, b] = [Number(ratio[1]), Number(ratio[2])];
      if (b === 1 && a > 0) return { unit: "pc", amount: a };
      if (a === 1 && b > 0) return { unit: "pc", amount: b };
    }

    const byClass = PACK_CLASS_RE.exec(n);
    if (byClass) return { unit: "pc", amount: Number(byClass[1]) };

    const plus = plusCount(n);
    if (plus) return { unit: "pc", amount: plus };
  }

  return null;
}

// Латинични букви што изгледаат како кирилични („ПИЈАЛAК" со латинско A).
const LOOKALIKES: Record<string, string> = { A: "А", B: "В", C: "С", E: "Е", H: "Н", K: "К", M: "М", O: "О", P: "Р", T: "Т", X: "Х", Y: "У", J: "Ј" };
export const CYRILLIC = /[\u0400-\u04FF]/;

/** Големи букви; во зборовите што имаат кирилица, латиничните „двојници" стануваат кирилични. */
export function normalizeLookalikes(text: string): string {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (CYRILLIC.test(w) ? w.replace(/[ABCEHKMOPTXYJ]/g, (c) => LOOKALIKES[c]) : w))
    .join(" ");
}
