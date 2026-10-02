// PriceStore во датотеки:
//   <root>/snapshots/<YYYY-MM-DD>/<storeId>.json — ценовник
//   <root>/changes/<YYYY-MM-DD>/<storeId>.json   — промени наспроти претходната снимка

import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChangesRecord, PriceStore } from "./price-store.ts";
import type { SnapshotFile } from "./types.ts";

export const DATA_DIR = path.join(import.meta.dirname, "..", "data");

const DATE_DIR = /^\d{4}-\d{2}-\d{2}$/;

async function dates(dir: string): Promise<string[]> {
  return (await readdir(dir).catch(() => [] as string[])).filter((d) => DATE_DIR.test(d)).sort();
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Прво во привремен фајл, па преименување: ако процесот падне на половина, или
 * `basket` чита додека `fetch` пишува, никогаш не се гледа половичен JSON.
 */
async function writeJson(dir: string, name: string, value: unknown): Promise<void> {
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `${name}.json`);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value), "utf8");
  await rename(tmp, target);
}

export function createFilePriceStore(root: string = DATA_DIR): PriceStore {
  const snapshotsDir = path.join(root, "snapshots");
  const changesDir = path.join(root, "changes");

  return {
    saveSnapshot: (date, snapshot) => writeJson(path.join(snapshotsDir, date), snapshot.storeId, snapshot),

    async latestSnapshot(storeId, beforeDate) {
      for (const date of (await dates(snapshotsDir)).reverse()) {
        if (beforeDate && date >= beforeDate) continue;
        const snapshot = await readJson<SnapshotFile>(path.join(snapshotsDir, date, `${storeId}.json`));
        if (snapshot) return { date, snapshot };
      }
      return null;
    },

    async latestSnapshots() {
      const found = new Map<string, { date: string; snapshot: SnapshotFile }>();
      for (const date of (await dates(snapshotsDir)).reverse()) {
        for (const file of await readdir(path.join(snapshotsDir, date))) {
          const storeId = file.replace(/\.json$/, "");
          if (!file.endsWith(".json") || found.has(storeId)) continue;
          const snapshot = await readJson<SnapshotFile>(path.join(snapshotsDir, date, file));
          if (snapshot) found.set(storeId, { date, snapshot });
        }
      }
      return [...found.values()];
    },

    saveChanges: (record) => writeJson(path.join(changesDir, record.date), record.storeId, record),

    async changesBetween(from, to) {
      const records: ChangesRecord[] = [];
      for (const date of await dates(changesDir)) {
        if (date < from || date > to) continue;
        for (const file of (await readdir(path.join(changesDir, date))).sort()) {
          const record = await readJson<ChangesRecord>(path.join(changesDir, date, file));
          if (record) records.push(record);
        }
      }
      return records;
    },
  };
}
