// Проверка на регистарот на продавници наспроти листите во изворите:
// нови продавници во Велес, продавници што ги нема повеќе, свесно изоставени.

import * as cheerio from "cheerio";

export interface SourceStore {
  /** Ид во изворот: org кај Жито/Стокомак, slug кај Рамстор, Id кај КАМ. */
  sourceId: string;
  label: string;
  inVeles: boolean;
}

const VELES = /велес/iu;

/** Жито и Стокомак: <select> со продавниците на „Проверка на цени". */
export function parseProverkaStores(html: string): SourceStore[] {
  const $ = cheerio.load(html);
  return $("select option")
    .toArray()
    .map((o) => ({ sourceId: $(o).attr("value") ?? "", label: $(o).text().trim() }))
    // Истиот <select> има и „10 / страница", „20 / страница"…
    .filter((s) => /^\d+$/.test(s.sourceId) && !s.label.includes("/ страница"))
    .map((s) => ({ ...s, inVeles: VELES.test(s.label) }));
}

/** Рамстор: картичките на страницата /marketi/ (име, адреса, линк до ценовникот). */
export function parseRamstoreStores(html: string): SourceStore[] {
  const $ = cheerio.load(html);
  return $(".store")
    .toArray()
    .map((card) => {
      const label = $(card).find("h2").text().trim();
      const address = $(card).find("p").first().text().trim();
      const href = /location\.href='([^']+)'/.exec($(card).find("button").attr("onclick") ?? "")?.[1] ?? "";
      const sourceId = /\/marketi\/([^/]+)\/?$/.exec(href)?.[1] ?? "";
      return { sourceId, label, inVeles: VELES.test(`${label} ${address}`) };
    })
    .filter((s) => s.sourceId !== "");
}

/** КАМ: одговорот од ShopsWeb/LoadShopList. */
export function parseKamStores(shops: unknown): SourceStore[] {
  if (!Array.isArray(shops)) throw new Error("КАМ: неочекуван одговор од листата продавници");
  return shops.map((s: { Id?: unknown; Name?: unknown; Address?: unknown; City?: unknown }) => ({
    sourceId: String(s.Id),
    label: `${s.Name ?? ""} (${s.Address ?? ""})`,
    inVeles: VELES.test(String(s.City ?? "")),
  }));
}

export interface RegistryComparison {
  /** Во Велес според изворот, а ги нема ни во регистарот ни меѓу изоставените. */
  missing: SourceStore[];
  /** Ид од регистарот што ги нема повеќе во изворот. */
  gone: string[];
  /** Свесно изоставени, а сè уште постојат во изворот. */
  ignored: SourceStore[];
}

export function compareWithRegistry(
  chain: string,
  found: SourceStore[],
  registry: { chain: string; sourceId: string }[],
  ignored: { chain: string; sourceId: string | number }[],
): RegistryComparison {
  const known = new Set(registry.filter((s) => s.chain === chain).map((s) => s.sourceId));
  const skipped = new Set(ignored.filter((s) => s.chain === chain).map((s) => String(s.sourceId)));
  const foundIds = new Set(found.map((s) => s.sourceId));

  return {
    missing: found.filter((s) => s.inVeles && !known.has(s.sourceId) && !skipped.has(s.sourceId)),
    gone: [...known].filter((id) => !foundIds.has(id)),
    ignored: found.filter((s) => skipped.has(s.sourceId)),
  };
}
