"use client";

// „Последна посета" за Поевтинето: датумот на пакетот (не часовникот на телефонот).
// - првпат: пред 7 дена;
// - повторно со истиот пакет: истиот датум како претходно (истата слика, не празно);
// - нов пакет: датумот на пакетот што го видел претходниот пат.

import { useEffect, useState } from "react";
import { addDays } from "../../src/dates.ts";
import { KEYS, load, save } from "./storage.ts";

interface StoredVisit {
  /** Пакетот што го видел. */
  seen: string;
  /** Од кога се споредувало тогаш. */
  since: string;
}

export const FIRST_VISIT_DAYS = 7;

export function useLastVisit(bundleDate: string | null): string | null {
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    if (!bundleDate) return;
    const stored = load<StoredVisit | null>(KEYS.lastVisit, null);
    const next = !stored
      ? addDays(bundleDate, -FIRST_VISIT_DAYS)
      : stored.seen === bundleDate
        ? stored.since
        : stored.seen;
    save(KEYS.lastVisit, { seen: bundleDate, since: next } satisfies StoredVisit);
    setSince(next);
  }, [bundleDate]);

  return since;
}
