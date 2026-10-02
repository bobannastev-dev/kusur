// Чување на ценовниците и промените. Логиката зависи само од овој интерфејс;
// денес е со датотеки (price-store-file.ts), подоцна и Postgres — со ист тест-пакет
// (price-store.contract.ts).

import { diffOffers, type PriceChange } from "./changes.ts";
import type { Offer, SnapshotFile } from "./types.ts";

/** Промените на една продавница за еден ден, наспроти нејзината претходна снимка. */
export interface ChangesRecord {
  storeId: string;
  /** Датумот на новата снимка (YYYY-MM-DD). */
  date: string;
  /** Датумот на снимката со која се споредува; null ако е прва. */
  prevDate: string | null;
  added: Offer[];
  removed: Offer[];
  changed: PriceChange[];
  /** Зошто нешто не е запишано (на пр. нецелосна снимка). */
  notes: string[];
}

export interface PriceStore {
  saveSnapshot(date: string, snapshot: SnapshotFile): Promise<void>;
  /** Најновата снимка на продавницата, строго пред `beforeDate` ако е даден. */
  latestSnapshot(storeId: string, beforeDate?: string): Promise<{ date: string; snapshot: SnapshotFile } | null>;
  /** Најновата снимка за секоја продавница (може од различни денови). */
  latestSnapshots(): Promise<{ date: string; snapshot: SnapshotFile }[]>;
  /** Ги заменува промените на продавницата за тој ден (повторно преземање во ист ден). */
  saveChanges(record: ChangesRecord): Promise<void>;
  /** Промените од `from` до `to` вклучително, по датум. */
  changesBetween(from: string, to: string): Promise<ChangesRecord[]>;
}

const isIncomplete = (s: SnapshotFile) => !!s.completeness && s.offers.length < s.completeness.expected;

/**
 * Запишува едно преземање: снимка + промени наспроти последната снимка од претходен ден.
 * Повторно преземање во ист ден ги заменува и снимката и промените, без дупли записи.
 */
export async function recordFetch(store: PriceStore, date: string, snapshot: SnapshotFile): Promise<ChangesRecord> {
  const prev = await store.latestSnapshot(snapshot.storeId, date);
  const diff = diffOffers(prev?.snapshot.offers ?? null, snapshot.offers);
  const notes: string[] = [];

  let removed = diff.removed;
  // Кај „Проверка на цени" ~1,5% производи случајно не стигнуваат: „исчезнат" не е сигурен.
  if (isIncomplete(snapshot) && removed.length > 0) {
    notes.push(`нецелосна снимка (${snapshot.offers.length} од ${snapshot.completeness!.expected}): ${removed.length} „исчезнати" не се запишани`);
    removed = [];
  }
  if (prev && isIncomplete(prev.snapshot) && diff.added.length > 0) {
    notes.push(`претходната снимка беше нецелосна: дел од ${diff.added.length} „нови" можеби не се нови`);
  }
  if (diff.duplicates.length > 0) notes.push(`дупли имиња: ${diff.duplicates.length}`);

  const record: ChangesRecord = {
    storeId: snapshot.storeId,
    date,
    prevDate: prev?.date ?? null,
    added: diff.added,
    removed,
    changed: diff.changed,
    notes,
  };
  await store.saveSnapshot(date, snapshot);
  await store.saveChanges(record);
  return record;
}
