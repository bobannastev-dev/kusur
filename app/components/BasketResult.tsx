"use client";

// Резултатот: најевтино на едно место, дали вреди втора продавница, и сите продавници.

import { useState } from "react";
import type { BasketComparison, Plan } from "../../src/basket.ts";
import { den, formatAmount, shortName } from "../lib/format.ts";
import styles from "./BasketResult.module.css";

function storeNames(plan: Plan) {
  return plan.stores.map((s) => s.label).join(" + ");
}

function PlanItems({ plan, showStore }: { plan: Plan; showStore: boolean }) {
  return (
    <ul className={styles.items}>
      {plan.items.map(({ line, store, purchase }) => (
        <li key={line.type.id} className={styles.item}>
          <div className={styles.itemHead}>
            <span>
              {shortName(line.type)} · {formatAmount(line.need, line.type.unit)}
            </span>
            <strong>{purchase ? den(purchase.cost) : "нема"}</strong>
          </div>
          {purchase && (
            <div className={styles.itemSub}>
              {purchase.offer.name}
              {showStore && store ? ` @ ${store.label}` : ""}
              {" · "}
              {purchase.divisible ? `на мерење, ${den(purchase.price)}/кг` : `${purchase.packs} × ${den(purchase.price)}`}
              {purchase.loyaltyPrice !== null
                ? ` · со клуб-картичка ${den(purchase.loyaltyPrice)}`
                : purchase.offer.regularPrice && purchase.price < purchase.offer.regularPrice
                  ? ` · акција, редовно ${den(purchase.offer.regularPrice)}`
                  : ""}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function BasketResult({ result, date }: { result: BasketComparison; date: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const best = result.single[0];
  const complete = result.single.filter((p) => p.missing.length === 0);
  const worst = complete.at(-1);
  const two = result.best.stores.length > 1 && result.best.total < best.total ? result.best : null;
  const max = Math.max(...result.single.map((p) => p.total));

  return (
    <>
      <section className={`glass ${styles.hero}`} aria-label="Најевтино на едно место">
        <div className="eyebrow">Најевтино на едно место</div>
        <div className={styles.total}>
          {best.total.toLocaleString("mk-MK")}
          <span> ден.</span>
        </div>
        <div className={styles.store}>{storeNames(best)}</div>
        {best.missing.length > 0 && <div className={styles.missing}>нема: {best.missing.map((l) => shortName(l.type)).join(", ")}</div>}
        {worst && worst !== best && best.missing.length === 0 && (
          <span className={styles.saving}>−{(worst.total - best.total).toLocaleString("mk-MK")} ден. наспроти најскапата</span>
        )}
      </section>

      {two && (
        <details className={`glass ${styles.two}`}>
          <summary>
            <span className={styles.twoIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3-8 4 16 3-8h4" />
              </svg>
            </span>
            <span>
              <strong>Со 2 продавници: {den(two.total)}</strong>
              <span className={styles.twoSub}>
                {storeNames(two)} · уште −{(best.total - two.total).toLocaleString("mk-MK")} ден.
              </span>
            </span>
          </summary>
          <PlanItems plan={two} showStore />
        </details>
      )}

      <section className={styles.stores} aria-label="Сите продавници">
        <div className={styles.storesHead}>
          <h2>Сите продавници</h2>
          <span>цени од {date}</span>
        </div>
        {result.single.map((plan, i) => {
          const id = plan.stores[0]?.storeId ?? String(i);
          const isOpen = open === id;
          return (
            <div key={id} className={`glass ${styles.row}`}>
              <button type="button" className={styles.rowButton} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)}>
                <span className={styles.rowHead}>
                  <span>{storeNames(plan) || "—"}</span>
                  <strong>{den(plan.total)}</strong>
                </span>
                <span className={styles.bar}>
                  <span style={{ width: `${Math.round((plan.total / max) * 100)}%` }} className={i === 0 ? styles.best : undefined} />
                </span>
                {plan.missing.length > 0 && <span className={styles.missing}>нема: {plan.missing.map((l) => shortName(l.type)).join(", ")}</span>}
              </button>
              {isOpen && <PlanItems plan={plan} showStore={false} />}
            </div>
          );
        })}
      </section>
    </>
  );
}
