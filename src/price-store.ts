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

/** Колку производи недостигаат во снимката; null ако снимката е целосна или изворот не брои. */
function missingCount(s: SnapshotFile): number | null {
  if (!s.completeness) return null;
  // Непознат вкупен број (0) значи „не знаеме дали е целосна" — се третира како нецелосна.
  if (s.completeness.expected <= 0) return Number.POSITIVE_INFINITY;
  const missing = s.completeness.expected - s.offers.length;
  return missing > 0 ? missing : null;
}

/**
 * Најновите снимки само за продавниците што се уште во регистарот
 * (стари снимки од изоставени продавници остануваат, но не се користат).
 */
export async function loadCurrentSnapshots(store: PriceStore, storeIds: Set<string>) {
  const latest = (await store.latestSnapshots()).filter((l) => storeIds.has(l.snapshot.storeId));
  if (latest.length === 0) throw new Error("Нема преземени ценовници. Прво пушти: npm run fetch");
  const dates = [...new Set(latest.map((l) => l.date))].sort();
  return { snapshots: latest.map((l) => l.snapshot), dates };
}

const MIN_OF_EXPECTED = 0.9;
const MIN_OF_PREVIOUS = 0.7;

/**
 * Скратен или празен ценовник (страница со грешка, сменет PDF) не смее да ја замени
 * добрата снимка: тогаш се фрла грешка и претходната снимка останува.
 */
function rejectIfTruncated(next: SnapshotFile, prev: SnapshotFile | null, sameDay: SnapshotFile | null): void {
  const count = next.offers.length;
  if (count === 0) throw new Error("празен ценовник — претходната снимка останува");

  const expected = next.completeness?.expected ?? 0;
  if (expected > 0 && count < MIN_OF_EXPECTED * expected) {
    throw new Error(`скратен ценовник: ${count} од ${expected} објавени — претходната снимка останува`);
  }
  for (const base of [prev, sameDay]) {
    if (base && count < MIN_OF_PREVIOUS * base.offers.length) {
      throw new Error(`скратен ценовник: ${count} наспроти ${base.offers.length} претходно — претходната снимка останува`);
    }
  }
}

/**
 * Запишува едно преземање: снимка + промени наспроти последната снимка од претходен ден.
 * Повторно преземање во ист ден ги заменува и снимката и промените, без дупли записи.
 */
export async function recordFetch(store: PriceStore, date: string, snapshot: SnapshotFile): Promise<ChangesRecord> {
  const prev = await store.latestSnapshot(snapshot.storeId, date);
  const latest = await store.latestSnapshot(snapshot.storeId);
  rejectIfTruncated(snapshot, prev?.snapshot ?? null, latest?.date === date ? latest.snapshot : null);

  const diff = diffOffers(prev?.snapshot.offers ?? null, snapshot.offers);
  const notes: string[] = [];

  let removed = diff.removed;
  // Кај „Проверка на цени" ~1,5% производи случајно не стигнуваат: „исчезнат" не е сигурен.
  const missing = missingCount(snapshot);
  if (missing !== null && removed.length > 0) {
    const of = Number.isFinite(missing) ? `${snapshot.offers.length} од ${snapshot.completeness?.expected}` : "непознат вкупен број";
    notes.push(`нецелосна снимка (${of}): ${removed.length} „исчезнати" не се запишани`);
    removed = [];
  }
  if (prev && missingCount(prev.snapshot) !== null && diff.added.length > 0) {
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
