// Распоред на преземањето: различни сервери паралелно, ист сервер — една по една
// продавница, со пауза меѓу нив. Со 11 продавници на Жито тоа е разликата меѓу
// 11 истовремени барања кон ист сервер и едно.

import { sleep } from "./net.ts";

export interface HostTask {
  id: string;
  host: string;
}

export interface RunResult<T extends HostTask> {
  store: T;
  error: unknown;
}

export function groupByHost<T extends HostTask>(stores: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const store of stores) {
    const list = groups.get(store.host) ?? [];
    list.push(store);
    groups.set(store.host, list);
  }
  return groups;
}

/** Ја извршува `run` за секоја продавница; неуспехот на една не ги запира другите. */
export async function runByHost<T extends HostTask>(
  stores: T[],
  run: (store: T) => Promise<void>,
  delayMs: number,
): Promise<RunResult<T>[]> {
  const groups = [...groupByHost(stores).values()];
  const perGroup = await Promise.all(
    groups.map(async (group) => {
      const results: RunResult<T>[] = [];
      for (const [i, store] of group.entries()) {
        if (i > 0) await sleep(delayMs);
        try {
          await run(store);
          results.push({ store, error: null });
        } catch (error) {
          results.push({ store, error });
        }
      }
      return results;
    }),
  );
  return perGroup.flat();
}
