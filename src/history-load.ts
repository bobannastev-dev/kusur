// Читање на историјата од PriceStore за командите (и подоцна веб-апликацијата).

import type { StoreHistory } from "./history.ts";
import type { PriceStore } from "./price-store.ts";

/** Најновата снимка и сите промени за секоја од дадените продавници. */
export async function loadHistories(store: PriceStore, storeIds: Set<string>): Promise<StoreHistory[]> {
  const latest = (await store.latestSnapshots()).filter((l) => storeIds.has(l.snapshot.storeId));
  if (latest.length === 0) throw new Error("Нема преземени ценовници. Прво пушти: npm run fetch");
  const changes = Map.groupBy(await store.changesBetween("0000-01-01", "9999-12-31"), (r) => r.storeId);
  return latest.map(({ date, snapshot }) => ({ date, snapshot, changes: changes.get(snapshot.storeId) ?? [] }));
}
