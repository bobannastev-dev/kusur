"use client";

// Еден производ во една продавница: денешната цена, историјата и „вистинска акција?".

import { promoCheck, PROMO_VERDICT_TEXT } from "../../src/history.ts";
import type { Offer } from "../../src/types.ts";
import { shortDate, usePriceData } from "../lib/data.tsx";
import { den } from "../lib/format.ts";
import styles from "./PriceHistorySheet.module.css";
import { Sheet } from "./Sheet.tsx";

export interface ProductRef {
  storeId: string;
  storeLabel: string;
  offer: Offer;
}

export function PriceHistorySheet({ product, onClose }: { product: ProductRef | null; onClose: () => void }) {
  const data = usePriceData();
  const view = data.status === "ready" ? data.view : null;
  const series = product && view ? view.seriesOf(product.storeId, product.offer.name) : [];
  const check = product && view ? promoCheck(product.offer, series, view.start(product.storeId)) : null;
  const offer = product?.offer;

  return (
    <Sheet open={product !== null} title={offer?.name ?? ""} onClose={onClose}>
      {product && offer && check && view && (
        <>
          <p className={styles.store}>{product.storeLabel}</p>
          <div className={styles.now}>
            <span className={styles.price}>{den(offer.price)}</span>
            {offer.regularPrice !== null && offer.regularPrice > offer.price && <span className={styles.was}>{den(offer.regularPrice)}</span>}
          </div>
          {offer.promoKind && (
            <p className={styles.promo}>
              {offer.promoKind}
              {offer.promoUntil ? ` · ${offer.promoUntil}` : ""}
            </p>
          )}
          {check.verdict !== "not-on-promo" && (
            <div className={`${styles.verdict} ${check.verdict === "genuine" ? styles.good : ""}`}>
              <strong>Вистинска акција?{check.loyalty ? " (со клуб-картичка)" : ""}</strong>
              <span>{PROMO_VERDICT_TEXT[check.verdict]}</span>
              {check.lowestBefore !== null && <span>Најниско во 30-те дена пред акцијата: {den(check.lowestBefore)}</span>}
            </div>
          )}
          <div>
            <h3 className={styles.heading}>Историја на цената</h3>
            <ol className={styles.history}>
              {[...series].reverse().map((p) => (
                <li key={p.date}>
                  <span>{shortDate(p.date)}</span>
                  <span>{p.price === null ? "го немаше" : den(p.price)}</span>
                </li>
              ))}
            </ol>
            <p className={styles.note}>Историја од {shortDate(view.start(product.storeId))}; се прикажуваат деновите со промена.</p>
          </div>
        </>
      )}
    </Sheet>
  );
}
