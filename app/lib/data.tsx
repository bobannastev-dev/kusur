"use client";

// Пакетот со цени (public/data/types.json) се вчитува еднаш и се дели меѓу екраните.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fromBundle, type BundleView, type PriceBundle } from "../../src/publish/bundle.ts";

export type PriceData =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; view: BundleView };

const PriceDataContext = createContext<PriceData>({ status: "loading" });

export function PriceDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PriceData>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/data/types.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PriceBundle>;
      })
      .then((bundle) => {
        if (!cancelled) setData({ status: "ready", view: fromBundle(bundle) });
      })
      .catch((err: unknown) => {
        if (!cancelled) setData({ status: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <PriceDataContext.Provider value={data}>{children}</PriceDataContext.Provider>;
}

export function usePriceData(): PriceData {
  return useContext(PriceDataContext);
}

/** „02.10." од „2026-10-02". */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}.${m}.`;
}
