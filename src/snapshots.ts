// Снимки од ценовниците на диск: data/snapshots/<YYYY-MM-DD>/<storeId>.json

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SnapshotFile } from "./types.ts";

const SNAPSHOTS_DIR = path.join(import.meta.dirname, "..", "data", "snapshots");

export async function saveSnapshot(date: string, snapshot: SnapshotFile): Promise<string> {
  const dir = path.join(SNAPSHOTS_DIR, date);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${snapshot.storeId}.json`);
  await writeFile(file, JSON.stringify(snapshot), "utf8");
  return file;
}

/** Ги вчитува снимките од најновиот ден за кој има податоци. */
export async function loadLatestSnapshots(): Promise<{ date: string; snapshots: SnapshotFile[] }> {
  const dates = (await readdir(SNAPSHOTS_DIR).catch(() => [])).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const date = dates.at(-1);
  if (!date) throw new Error("Нема преземени ценовници. Прво пушти: npm run fetch");

  const dir = path.join(SNAPSHOTS_DIR, date);
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const snapshots = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SnapshotFile),
  );
  return { date, snapshots };
}
