// Официјалните портали „Проверка на цени" (иста платформа за повеќе синџири):
//   https://zito.proverkanaceni.mk/ · https://stokomak.proverkanaceni.mk/
//
// Server-rendered табела, параметри во URL-от: ?org=<продавница>&perPage=100&page=<n>.
// Без `search` се добива целиот ценовник на продавницата, страница по страница.
// Редоследот меѓу страниците не е стабилен — види passes.ts.

import * as cheerio from "cheerio";
import { fetchHtml, sleep, REQUEST_DELAY_MS } from "../net.ts";
import type { Offer, StoreSnapshot } from "../types.ts";
import { collectUntilComplete, type Pass } from "./passes.ts";
import { rowToOffer, type ColumnMap } from "./table.ts";

const PER_PAGE = 100;
const MAX_PAGES = 150; // заштита од бесконечна јамка
const MAX_PASSES = 3;

const COLUMNS: ColumnMap = {
  name: 0,
  price: 1,
  unitPrice: 2,
  category: 3,
  availability: 4,
  regularPrice: 5,
  promoKind: 7,
  promoUntil: 8,
};

export interface ProverkaPage {
  updatedAt: string | null;
  offers: Offer[];
  /** Број на редови во табелата, вклучително и оние што не станале понуда. */
  rowCount: number;
  /** Колку производи објавува изворот („од N артикли"); 0 ако не е објавено. */
  total: number;
}

/** Една страница од ценовникот, без мрежа — за тестови и за преземањето. */
export function parseProverkaPage(html: string): ProverkaPage {
  const $ = cheerio.load(html);
  const updatedAt = /последно ажурирање на цените:\s*([\d/]+\s+[\d:]+)/.exec($.root().text())?.[1] ?? null;

  const rows = $("table tbody tr").toArray();
  const offers: Offer[] = [];
  for (const tr of rows) {
    const cells = $(tr).find("td").toArray().map((td) => $(td).text().trim());
    const offer = rowToOffer(cells, COLUMNS);
    if (offer) offers.push(offer);
  }
  const total = Number(/од\s+(\d+)\s+артикли/.exec($.root().text())?.[1] ?? 0);
  return { updatedAt, offers, rowCount: rows.length, total };
}

/** Едно поминување низ сите страници на ценовникот. */
async function fetchAllPages(baseUrl: string, org: number): Promise<Pass> {
  const offers: Offer[] = [];
  let updatedAt: string | null = null;
  let total = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const parsed = parseProverkaPage(await fetchHtml(`${baseUrl}?org=${org}&perPage=${PER_PAGE}&page=${page}`));
    updatedAt ??= parsed.updatedAt;
    total ||= parsed.total;
    offers.push(...parsed.offers);

    // „Последна страница?" се одлучува по бројот на редови, не по бројот на
    // успешно парсирани понуди — ред без цена не смее да нè излаже.
    if (parsed.rowCount < PER_PAGE) return { offers, total, updatedAt };
    await sleep(REQUEST_DELAY_MS);
  }

  throw new Error(`${baseUrl} org=${org}: над ${MAX_PAGES} страници — ценовникот би бил пресечен`);
}

export async function fetchProverkaNaCeni(baseUrl: string, org: number): Promise<StoreSnapshot> {
  let first = true;
  const { offers, updatedAt, expected, passes } = await collectUntilComplete(async () => {
    if (!first) await sleep(REQUEST_DELAY_MS);
    first = false;
    return fetchAllPages(baseUrl, org);
  }, MAX_PASSES);
  return { updatedAt, offers, completeness: { expected, passes } };
}
