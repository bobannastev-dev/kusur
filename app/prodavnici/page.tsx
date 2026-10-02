"use client";

// Продавници: од каде се цените и колку се свежи.

import { DataStatus } from "../components/DataStatus.tsx";
import { usePriceData } from "../lib/data.tsx";
import styles from "./page.module.css";

/** „02/10/2026 08:02", „02.10.2026 4:00AM", „02.10.2026 5:44:33AM" → „02.10. 08:02". */
function formatUpdated(text: string | null): string {
  if (!text) return "непознато";
  const m = /(\d{2})[./](\d{2})[./]\d{4}\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i.exec(text);
  if (!m) return text;
  let hour = Number(m[3]);
  if (m[5]?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (m[5]?.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${m[1]}.${m[2]}. ${String(hour).padStart(2, "0")}:${m[4]}`;
}

export default function StoresPage() {
  const data = usePriceData();
  const stores = data.status === "ready" ? [...data.view.bundle.stores].sort((a, b) => a.chain.localeCompare(b.chain, "mk") || b.count - a.count) : [];

  return (
    <main className="page">
      <div>
        <h1 className="title">Продавници</h1>
        <p className="lead">
          Цените ги објавуваат самите маркети секој ден — законска обврска од 18 април 2025. Ние ги преземаме наутро и ги споредуваме.
        </p>
      </div>

      {data.status !== "ready" && <DataStatus />}

      <ul className={styles.list}>
        {stores.map((s) => (
          <li key={s.id} className={`glass ${styles.store}`}>
            <div>
              <div className={styles.name}>{s.label}</div>
              <div className={styles.meta}>{s.count.toLocaleString("mk-MK")} производи</div>
            </div>
            <div className={styles.updated}>
              {s.stale ? <span className={styles.stale}>застарено</span> : "ажурирано"}
              <br />
              <strong>{formatUpdated(s.updatedAt)}</strong>
            </div>
          </li>
        ))}
      </ul>

      {stores.some((s) => s.stale) && (
        <p className={styles.note}>„Застарено": маркетот не го ажурирал ценовникот повеќе од 2 дена — неговите цени може да не се точни.</p>
      )}
    </main>
  );
}
