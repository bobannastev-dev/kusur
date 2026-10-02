// „Проверка на цени" (Жито, Стокомак) враќа редови во различен редослед при секое
// барање, без параметар за подредување: на границата меѓу страниците ист производ
// доаѓа двапати, а друг никогаш. Затоа ценовникот се презема во повеќе поминувања
// што се спојуваат по име, додека не се соберат толку производи колку што објавува
// самиот извор („од N артикли"). Вистински дупликати по име нема (проверено 2026-10-01).

import type { Offer } from "../types.ts";

export interface Pass {
  offers: Offer[];
  /** Колку производи вкупно објавува изворот. */
  total: number;
  updatedAt: string | null;
}

export interface Collected {
  offers: Offer[];
  updatedAt: string | null;
  /** Колку производи објавува изворот. */
  expected: number;
  passes: number;
}

export async function collectUntilComplete(runPass: () => Promise<Pass>, maxPasses: number): Promise<Collected> {
  const byName = new Map<string, Offer>();
  let expected = 0;
  let updatedAt: string | null = null;
  let passes = 0;

  while (passes < maxPasses) {
    const pass = await runPass();
    passes++;
    expected = pass.total;
    updatedAt ??= pass.updatedAt;

    const before = byName.size;
    for (const offer of pass.offers) if (!byName.has(offer.name)) byName.set(offer.name, offer);

    // expected = 0: изворот не го објавил бројот (или е сменет текстот) — тогаш не
    // знаеме кога е „сè", па се прават сите поминувања.
    if (expected > 0 && byName.size >= expected) break; // сè е собрано
    if (expected > 0 && passes >= 2 && byName.size === before) break; // ново поминување не донело ништо
  }

  return { offers: [...byName.values()], updatedAt, expected, passes };
}
