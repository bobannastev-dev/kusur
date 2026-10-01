// Ги споредува листите продавници во изворите со регистарот (src/stores.ts).
// Употреба: npm run stores
// Излезен код 1 ако има нова продавница во Велес или исчезната од регистарот.

import { fetchHtml, postJson } from "./net.ts";
import { compareWithRegistry, parseKamStores, parseProverkaStores, parseRamstoreStores, type SourceStore } from "./stores-check.ts";
import { IGNORED_STORES, STORES } from "./stores.ts";

const SOURCES: { chain: string; load: () => Promise<SourceStore[]> }[] = [
  { chain: "Жито", load: async () => parseProverkaStores(await fetchHtml("https://zito.proverkanaceni.mk/")) },
  { chain: "Стокомак", load: async () => parseProverkaStores(await fetchHtml("https://stokomak.proverkanaceni.mk/")) },
  { chain: "Рамстор", load: async () => parseRamstoreStores(await fetchHtml("https://ramstore.com.mk/marketi/")) },
  { chain: "КАМ", load: async () => parseKamStores(await postJson("https://kam.com.mk/ShopsWeb/LoadShopList", null)) },
];

let problems = 0;
for (const { chain, load } of SOURCES) {
  let found: SourceStore[];
  try {
    found = await load();
  } catch (err) {
    problems++;
    console.log(`✗ ${chain}: листата не може да се преземе — ${err instanceof Error ? err.message : err}`);
    continue;
  }

  const { missing, gone, ignored } = compareWithRegistry(chain, found, STORES, IGNORED_STORES);
  const registered = STORES.filter((s) => s.chain === chain).length;
  console.log(`${missing.length || gone.length ? "!" : "✓"} ${chain}: ${registered} во регистарот, ${found.filter((s) => s.inVeles).length} во Велес според изворот (вкупно ${found.length})`);
  for (const s of missing) console.log(`    НОВА      ${s.sourceId} — ${s.label}`);
  for (const id of gone) console.log(`    ИСЧЕЗНАТА ${id} — ${STORES.find((s) => s.chain === chain && s.sourceId === id)?.label}`);
  for (const s of ignored) {
    const reason = IGNORED_STORES.find((i) => i.chain === chain && String(i.sourceId) === s.sourceId)?.reason;
    console.log(`    изоставена ${s.sourceId} — ${s.label}: ${reason}`);
  }
  problems += missing.length + gone.length;
}

if (problems > 0) process.exit(1);
