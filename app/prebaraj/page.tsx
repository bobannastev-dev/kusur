"use client";

// Пребарај: тип производ → најевтино во Велес и цената во секоја продавница.

import { useMemo, useState } from "react";
import { TYPES_BY_ID, type ProductType } from "../../src/catalog.ts";
import { cheapestFromCandidates, type Purchase } from "../../src/match.ts";
import type { SnapshotFile } from "../../src/types.ts";
import { DataStatus } from "../components/DataStatus.tsx";
import forms from "../components/Forms.module.css";
import { PriceHistorySheet, type ProductRef } from "../components/PriceHistorySheet.tsx";
import { usePriceData } from "../lib/data.tsx";
import { useFollowed } from "../lib/followed.ts";
import { den, formatAmount, shortName } from "../lib/format.ts";
import { searchTypes } from "../lib/search.ts";
import styles from "./page.module.css";

const POPULAR = ["mleko", "leb", "jajca", "sirenje", "kafe", "maslo", "seker", "oriz", "jogurt", "pile"];

export default function SearchPage() {
  const data = usePriceData();
  const followed = useFollowed();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ProductType | null>(null);
  const [product, setProduct] = useState<ProductRef | null>(null);
  const suggestions = type ? [] : searchTypes(query, 8);

  const rows = useMemo(() => {
    if (!type || data.status !== "ready") return [];
    const { view } = data;
    return view.stores
      .map((store) => ({ store, purchase: cheapestFromCandidates(view.candidatesFor(store, type), type.defaultAmount) }))
      .filter((r): r is { store: SnapshotFile; purchase: Purchase } => r.purchase !== null)
      .sort((a, b) => a.purchase.cost - b.purchase.cost);
  }, [type, data]);

  const pick = (t: ProductType) => {
    setType(t);
    setQuery(shortName(t));
  };

  return (
    <main className="page">
      <div>
        <h1 className="title">Пребарај</h1>
        <DataStatus />
      </div>

      <label className={forms.field}>
        <span className="visually-hidden">Производ</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setType(null);
          }}
          placeholder="млеко, кафе, mleko…"
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {!type && !query.trim() && (
        <ul className={styles.chips} aria-label="Чести производи">
          {POPULAR.map((id) => TYPES_BY_ID.get(id)).filter((t): t is ProductType => !!t).map((t) => (
            <li key={t.id}>
              <button type="button" className={styles.chip} onClick={() => pick(t)}>
                {shortName(t)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <ul className={forms.options}>
          {suggestions.map((t) => (
            <li key={t.id}>
              <button type="button" className={forms.option} onClick={() => pick(t)}>
                <span>
                  <strong>{shortName(t)}</strong>
                  <span className={forms.hint}>{t.label}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!type && query.trim() && suggestions.length === 0 && <p className={forms.hint}>Нема таков производ во списокот на типови.</p>}

      {type && (
        <>
          <section className={`glass ${styles.hero}`}>
            <div className={styles.heroHead}>
              <div className="eyebrow">
                {type.label} · {formatAmount(type.defaultAmount, type.unit)}
              </div>
              <button
                type="button"
                className={styles.star}
                aria-pressed={followed.isFollowed(type.id)}
                onClick={() => followed.toggle(type.id)}
                aria-label={followed.isFollowed(type.id) ? "Престани да следиш" : "Следи поевтинувања"}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={followed.isFollowed(type.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
                </svg>
              </button>
            </div>
            {rows[0] ? (
              <>
                <div className={styles.price}>{den(rows[0].purchase.cost)}</div>
                <div className={styles.sub}>
                  најевтино во Велес · {rows[0].purchase.offer.name} во {rows.filter((r) => r.purchase.cost === rows[0].purchase.cost).map((r) => r.store.label).join(", ")}
                </div>
              </>
            ) : (
              <div className={styles.sub}>{data.status === "ready" ? "Го нема во ниту една продавница." : "Се вчитуваат цените…"}</div>
            )}
            {followed.isFollowed(type.id) && <div className={styles.following}>Го следиш — ќе го видиш во „Поевтинето".</div>}
          </section>

          <ul className={styles.rows} aria-label="Цена по продавница">
            {rows.map(({ store, purchase }) => (
              <li key={store.storeId}>
                <button
                  type="button"
                  className={`glass ${styles.row}`}
                  onClick={() => setProduct({ storeId: store.storeId, storeLabel: store.label, offer: purchase.offer })}
                >
                  <span className={styles.rowText}>
                    <strong>{store.label}</strong>
                    <span>
                      {purchase.offer.name}
                      {purchase.packs > 1 ? ` · ${purchase.packs} ×` : ""}
                      {purchase.loyaltyPrice !== null ? " · клуб-цена " + den(purchase.loyaltyPrice) : ""}
                    </span>
                  </span>
                  <strong className={styles.rowPrice}>{den(purchase.cost)}</strong>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <PriceHistorySheet product={product} onClose={() => setProduct(null)} />
    </main>
  );
}
