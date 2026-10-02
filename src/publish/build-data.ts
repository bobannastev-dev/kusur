// Пакетот со цени за телефонот: public/data/types.json и stores.json.
// Употреба: npm run build-data   (по npm run fetch)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { CATALOG } from "../catalog.ts";
import { loadHistories } from "../history-load.ts";
import { createFilePriceStore } from "../price-store-file.ts";
import { STORES } from "../stores.ts";
import { defaultTypeMaps } from "../type-maps.ts";
import { buildBundle } from "./build.ts";

const OUT_DIR = path.join(import.meta.dirname, "..", "..", "public", "data");
/** Граници од SPEC-web-app.md (критериуми 1 и 5). */
const MAX_RAW = 2 * 1024 * 1024;
const MAX_COMPRESSED = 400 * 1024;

const started = Date.now();
const histories = await loadHistories(createFilePriceStore(), new Set(STORES.map((s) => s.id)));
const date = histories.map((h) => h.date).sort().at(-1)!;
const bundle = buildBundle(histories, CATALOG, defaultTypeMaps(), date);

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
await mkdir(OUT_DIR, { recursive: true });
const files = {
  "types.json": JSON.stringify(bundle),
  "stores.json": JSON.stringify({ version: bundle.version, date: bundle.date, stores: bundle.stores }),
};
let tooBig = false;
for (const [name, text] of Object.entries(files)) {
  await writeFile(path.join(OUT_DIR, name), text, "utf8");
  const raw = Buffer.byteLength(text);
  const gz = gzipSync(text).length;
  const br = brotliCompressSync(text).length;
  console.log(`${name}: ${kb(raw)} (gzip ${kb(gz)}, brotli ${kb(br)})`);
  if (name === "types.json" && (raw > MAX_RAW || gz > MAX_COMPRESSED)) tooBig = true;
}

const candidates = Object.values(bundle.types).flatMap((byStore) => Object.values(byStore)).flat();
console.log(
  `${bundle.stores.length} продавници, ${CATALOG.length} типови, ${candidates.length} кандидати ` +
    `(${candidates.filter((c) => c.s).length} со историја), цени од ${date} — ${((Date.now() - started) / 1000).toFixed(1)} сек`,
);
if (tooBig) {
  console.error(`Пакетот е преголем (граница ${kb(MAX_RAW)} необработено, ${kb(MAX_COMPRESSED)} gzip).`);
  process.exit(1);
}
