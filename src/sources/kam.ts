// КАМ: ценовник во PDF по продавница (~156 страници, ~1.700 производи).
//
// Табелата има исти колони како законски пропишаната, но ќелиите се кршат во повеќе
// линии, па текстот се чита по позиција: колоните од x-позициите на заглавјето,
// редовите од ознаката „Да"/„Не" во колоната за достапност. Ќелиите се порамнети горе.
// КАМ нема колона за категорија — „Опис на стока" е опис (бренд + производ).

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextItem } from "pdfjs-dist/types/src/display/api.js";
import { fetchBytes, postJson, REQUEST_DELAY_MS, sleep } from "../net.ts";
import { parsePrice } from "../parse.ts";
import type { Offer, StoreSnapshot } from "../types.ts";

/** Почетокот на секоја колона се препознава по зборот во заглавјето. */
const HEADER_WORDS = [
  ["name", "Назив"],
  ["price", "Продажна"],
  ["unitPrice", "Единична"],
  ["description", "Опис"],
  ["availability", "Достапност"],
  ["regularPrice", "Редовна"],
  ["discountPrice", "Цена"],
  ["promoKind", "Вид"],
  ["promoUntil", "Времетраење"],
] as const;

type Column = (typeof HEADER_WORDS)[number][0];

/** Колку над ознаката „Да" може да започне текстот во истиот ред (ќелиите се порамнети горе). */
const ROW_TOP_TOLERANCE = 5;
/** Текст на иста висина во рамки на оваа разлика е иста линија. */
const LINE_TOLERANCE = 1;

interface Word {
  str: string;
  x: number;
  y: number;
}

export interface KamPage extends StoreSnapshot {
  /** Број на редови „Да"/„Не", вклучително и оние што не станале понуда. */
  rowCount: number;
}

function columnStarts(words: Word[]): Map<Column, number> | null {
  const starts = new Map<Column, number>();
  for (const [column, label] of HEADER_WORDS) {
    const word = words.find((w) => w.str === label);
    if (!word) return null;
    starts.set(column, word.x);
  }
  return starts;
}

function columnOf(x: number, starts: Map<Column, number>): Column {
  let found: Column = "name";
  for (const [column, start] of starts) if (x >= start - 3) found = column;
  return found;
}

/** Зборовите од една ќелија → текст: линиите од горе надолу, во линија по x. */
function cellText(words: Word[]): string {
  const sorted = [...words].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: string[] = [];
  let lastY = Number.POSITIVE_INFINITY;
  for (const w of sorted) {
    if (Math.abs(w.y - lastY) > LINE_TOLERANCE) lines.push("");
    lines[lines.length - 1] += w.str;
    lastY = w.y;
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function parsePage(items: TextItem[]): { offers: Offer[]; rowCount: number; text: string } {
  const words: Word[] = items
    .filter((it) => it.str !== "")
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
  const text = words.map((w) => w.str).join(" ");

  const starts = columnStarts(words);
  if (!starts) return { offers: [], rowCount: 0, text };

  // Сè под најниското заглавје е табела.
  const headerLabels: readonly string[] = HEADER_WORDS.map(([, label]) => label);
  const headerBottom = Math.min(...words.filter((w) => headerLabels.includes(w.str)).map((w) => w.y));
  // Празните места се посебни ставки и се чуваат: без нив „ТОРТ. ДОРА" станува „ТОРТ.ДОРА".
  const body = words.filter((w) => w.y < headerBottom - 2);

  const anchors = body
    .filter((w) => columnOf(w.x, starts) === "availability" && /^(Да|Не)$/.test(w.str.trim()))
    .map((w) => w.y)
    .sort((a, b) => b - a);

  // Секој збор припаѓа на најниската ознака „Да" што не е под него повеќе од толеранцијата.
  const rows = anchors.map(() => new Map<Column, Word[]>());
  for (const w of body) {
    let row = -1;
    for (let i = 0; i < anchors.length; i++) if (anchors[i] + ROW_TOP_TOLERANCE >= w.y) row = i;
    if (row === -1) continue;
    const column = columnOf(w.x, starts);
    const cell = rows[row].get(column) ?? [];
    cell.push(w);
    rows[row].set(column, cell);
  }

  const offers: Offer[] = [];
  for (const row of rows) {
    const cell = (c: Column) => cellText(row.get(c) ?? []);
    if (cell("availability").startsWith("Не")) continue;
    const name = cell("name");
    const price = parsePrice(cell("price"));
    if (!name || price === null || price <= 0) continue;
    offers.push({
      name,
      price,
      regularPrice: parsePrice(cell("regularPrice")),
      unitPriceText: cell("unitPrice"),
      category: "",
      description: cell("description"),
      promoUntil: cell("promoUntil") || null,
    });
  }
  return { offers, rowCount: anchors.length, text };
}

export async function parseKamPdf(data: Uint8Array): Promise<KamPage> {
  // PDF-от доаѓа однадвор: фонтовите не се вчитуваат (ни требаат само текстот и позициите).
  const task = getDocument({ data, verbosity: 0, disableFontFace: true });
  const doc = await task.promise;
  try {
    const offers: Offer[] = [];
    let rowCount = 0;
    let updatedAt: string | null = null;

    for (let n = 1; n <= doc.numPages; n++) {
      const content = await (await doc.getPage(n)).getTextContent();
      const page = parsePage(content.items.filter((it): it is TextItem => "str" in it));
      updatedAt ??=
        /ажурирање\s+на\s+цените\s*:\s*([\d.]+\s+[\d:]+\s*(?:AM|PM)?)/i.exec(page.text)?.[1].replace(/\s+/g, " ") ?? null;
      offers.push(...page.offers);
      rowCount += page.rowCount;
    }

    if (offers.length === 0) throw new Error("PDF-от нема препознаена табела со цени");
    return { updatedAt, offers, rowCount };
  } finally {
    await task.destroy();
  }
}

const KAM_BASE = "https://kam.com.mk/";

/**
 * Адресата на денешниот PDF ценовник на продавница, од одговорот на
 * `ShopsWeb/LoadShopList` (листа продавници, секоја со `ShopFiles[0].RelativePath`).
 * Одговорот доаѓа однадвор, па се проверува.
 */
export function kamPricelistUrl(shops: unknown, shopId: number): string {
  if (!Array.isArray(shops)) throw new Error("КАМ: неочекуван одговор од листата продавници");
  const shop = shops.find((s) => s && typeof s === "object" && (s as { Id?: unknown }).Id === shopId);
  if (!shop) throw new Error(`КАМ: нема продавница ${shopId} во листата`);
  const path = (shop as { ShopFiles?: { RelativePath?: unknown }[] }).ShopFiles?.[0]?.RelativePath;
  if (typeof path !== "string" || !path.endsWith(".pdf")) throw new Error(`КАМ: продавницата ${shopId} нема ценовник`);
  // Патеката доаѓа однадвор: апсолутна адреса („https://…“, „//…“) би нè однела на друг сервер.
  const url = new URL(path, KAM_BASE);
  if (url.origin !== new URL(KAM_BASE).origin) throw new Error(`КАМ: ценовникот на продавницата ${shopId} е на друг сервер (${url.origin})`);
  return url.href;
}

/** Цел ценовник на една продавница на КАМ: листа продавници → PDF → редови. */
export async function fetchKam(shopId: number): Promise<StoreSnapshot> {
  const url = kamPricelistUrl(await postJson(new URL("ShopsWeb/LoadShopList", KAM_BASE).href, null), shopId);
  await sleep(REQUEST_DELAY_MS); // двете барања се кон ист сервер
  const { updatedAt, offers } = await parseKamPdf(await fetchBytes(url));
  return { updatedAt, offers };
}
