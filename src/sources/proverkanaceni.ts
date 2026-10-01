// Официјалните портали „Проверка на цени" (иста платформа за повеќе синџири):
//   https://zito.proverkanaceni.mk/ · https://stokomak.proverkanaceni.mk/
//
// Server-rendered табела, параметри во URL-от: ?org=<продавница>&perPage=100&page=<n>.
// Без `search` се добива целиот ценовник на продавницата, страница по страница.

import * as cheerio from "cheerio";
import { fetchHtml, sleep, REQUEST_DELAY_MS } from "../net.ts";
import type { Offer, StoreSnapshot } from "../types.ts";
import { rowToOffer, type ColumnMap } from "./table.ts";

const PER_PAGE = 100;
const MAX_PAGES = 150; // заштита од бесконечна јамка

const COLUMNS: ColumnMap = {
  name: 0,
  price: 1,
  unitPrice: 2,
  category: 3,
  availability: 4,
  regularPrice: 5,
};

export async function fetchProverkaNaCeni(baseUrl: string, org: number): Promise<StoreSnapshot> {
  const offers: Offer[] = [];
  let updatedAt: string | null = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchHtml(`${baseUrl}?org=${org}&perPage=${PER_PAGE}&page=${page}`);
    const $ = cheerio.load(html);

    updatedAt ??= /последно ажурирање на цените:\s*([\d/]+\s+[\d:]+)/.exec($.root().text())?.[1] ?? null;

    const rows = $("table tbody tr").toArray();
    for (const tr of rows) {
      const cells = $(tr).find("td").toArray().map((td) => $(td).text().trim());
      const offer = rowToOffer(cells, COLUMNS);
      if (offer) offers.push(offer);
    }

    // „Последна страница?" се одлучува по бројот на редови, не по бројот на
    // успешно парсирани понуди — ред без цена не смее да нè излаже.
    if (rows.length < PER_PAGE) return { updatedAt, offers };
    await sleep(REQUEST_DELAY_MS);
  }

  throw new Error(`${baseUrl} org=${org}: над ${MAX_PAGES} страници — ценовникот би бил пресечен`);
}
