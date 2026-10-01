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
  promoUntil: 9,
};

/** Цел ценовник од една страница, без мрежа — за тестови и за преземањето. */
export function parseRamstorePage(html: string): StoreSnapshot {
  const $ = cheerio.load(html);

  const updatedAt =
    /последно ажурирање на цените:\s*([\d.]+\s+[\d:]+\s*(?:AM|PM)?)/i.exec($.root().text())?.[1] ?? null;

  const offers: Offer[] = [];
  for (const tr of $("#productsTable tbody tr").toArray()) {
    const cells = $(tr).find("td").toArray().map((td) => $(td).text().trim());
    const offer = rowToOffer(cells, COLUMNS);
    if (offer) offers.push(offer);
  }

  if (offers.length === 0) throw new Error("табелата со цени е празна или е сменета");
  return { updatedAt, offers };
}

export async function fetchRamstore(storeUrl: string): Promise<StoreSnapshot> {
  try {
    return parseRamstorePage(await fetchHtml(storeUrl));
  } catch (err) {
    throw new Error(`${storeUrl}: ${err instanceof Error ? err.message : err}`, { cause: err });
  }
}
