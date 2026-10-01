// Рамстор: секоја продавница има страница /marketi/<продавница>/ со целиот ценовник
// во една server-rendered табела (#productsTable), па доволно е едно барање.

import * as cheerio from "cheerio";
import { fetchHtml } from "../net.ts";
import type { Offer, StoreSnapshot } from "../types.ts";
import { rowToOffer, type ColumnMap } from "./table.ts";

const COLUMNS: ColumnMap = {
  name: 0,
  price: 1,
  unitPrice: 2,
  category: 3,
  availability: 4,
  regularPrice: 5,
};

export async function fetchRamstore(storeUrl: string): Promise<StoreSnapshot> {
  const html = await fetchHtml(storeUrl);
  const $ = cheerio.load(html);

  const updatedAt =
    /последно ажурирање на цените:\s*([\d.]+\s+[\d:]+\s*(?:AM|PM)?)/i.exec($.root().text())?.[1] ?? null;

  const offers: Offer[] = [];
  for (const tr of $("#productsTable tbody tr").toArray()) {
    const cells = $(tr).find("td").toArray().map((td) => $(td).text().trim());
    const offer = rowToOffer(cells, COLUMNS);
    if (offer) offers.push(offer);
  }

  if (offers.length === 0) throw new Error(`${storeUrl}: табелата со цени е празна или е сменета`);
  return { updatedAt, offers };
}
