"use client";

// Од кога се цените и колку продавници — или дека се вчитуваат.

import { shortDate, usePriceData } from "../lib/data.tsx";

export function DataStatus() {
  const data = usePriceData();
  if (data.status === "loading") return <p className="lead">Се вчитуваат цените…</p>;
  if (data.status === "error") return <p className="lead">Цените не се вчитаа ({data.message}). Пробај повторно.</p>;
  const { bundle } = data.view;
  return (
    <p className="lead">
      Цени од {shortDate(bundle.date)} · {bundle.stores.length} продавници во Велес
    </p>
  );
}
