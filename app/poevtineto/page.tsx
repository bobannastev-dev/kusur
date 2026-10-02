"use client";

// Поевтинето: следените типови (од кошничката и ѕвездите), поевтинети за 5% или повеќе
// од последната посета, со „вистинска акција?".

import Link from "next/link";
import { useMemo, useState } from "react";
import { TYPES_BY_ID, type ProductType } from "../../src/catalog.ts";
import { addDays } from "../../src/dates.ts";
import { dropsFrom, promoCheck, type PromoVerdict } from "../../src/history.ts";
import { DataStatus } from "../components/DataStatus.tsx";
import { PriceHistorySheet, type ProductRef } from "../components/PriceHistorySheet.tsx";
import { useBasket } from "../lib/basket.ts";
import { shortDate, usePriceData } from "../lib/data.tsx";
import { useFollowed } from "../lib/followed.ts";
import { den, shortName } from "../lib/format.ts";
import { useLastVisit } from "../lib/visit.ts";
import styles from "./page.module.css";

const VERDICT_SHORT: Record<PromoVerdict, string> = {
  genuine: "Вистинска акција",
  "not-lower": "Не е пониско од пред акцијата",
  "regular-raised": "Редовната цена е кренана",
  insufficient: "Акција? Уште нема 30 дена историја",
  "not-on-promo": "",
};

const UNIT: Record<string, string> = { kg: "кг", l: "л", pc: "парче" };

type Range = "visit" | "7" | "30";

export default function DropsPage() {
  const data = usePriceData();
  const view = data.status === "ready" ? data.view : null;
  const basket = useBasket();
  const followed = useFollowed();
  const lastVisit = useLastVisit(view?.bundle.date ?? null);
  const [range, setRange] = useState<Range>("visit");
  const [product, setProduct] = useState<ProductRef | null>(null);

  const types = useMemo(() => {
    const ids = new Set([...basket.lines.map((l) => l.type.id), ...followed.ids]);
    return [...ids].map((id) => TYPES_BY_ID.get(id)).filter((t): t is ProductType => !!t);
  }, [basket.lines, followed.ids]);

  const since = !view ? null : range === "visit" ? lastVisit : addDays(view.bundle.date, -Number(range));

  const cards = useMemo(() => {
    if (!view || !since || types.length === 0) return null;
    const results = dropsFrom(view.prepared, types, since);
    const chainSize = new Map<string, number>();
    for (const s of view.stores) chainSize.set(s.chain, (chainSize.get(s.chain) ?? 0) + 1);

    // Ист производ со иста промена во повеќе продавници = една картичка.
    const grouped = new Map<string, { type: ProductType; drop: (typeof results)[0]["drops"][0]; stores: typeof view.stores }>();
    for (const r of results) {
      for (const d of r.drops) {
        const key = `${d.offer.name}|${d.oldPrice}|${d.newPrice}`;
        const g = grouped.get(key);
        if (g) g.stores.push(d.store);
        else grouped.set(key, { type: r.type, drop: d, stores: [d.store] });
      }
    }
    const drops = [...grouped.values()]
      .map((g) => {
        const first = g.stores[0];
        const chain = first.chain;
        const allOfChain = g.stores.every((s) => s.chain === chain) && g.stores.length === chainSize.get(chain) && g.stores.length > 1;
        const where = allOfChain
          ? `${chain} · ${g.stores.length === 2 ? "двете" : `сите ${g.stores.length}`} продавници`
          : g.stores.map((s) => s.label).join(", ");
        const check = promoCheck(g.drop.offer, view.seriesOf(first.storeId, g.drop.offer.name), view.start(first.storeId));
        return { ...g, where, check, pct: 1 - g.drop.newPrice / g.drop.oldPrice };
      })
      .sort((a, b) => b.pct - a.pct);
    const cheapest = results.filter((r) => r.cheapest.dropped && r.cheapest.then && r.cheapest.now);
    return { drops, cheapest, sinceUsed: results[0]?.since ?? since, adjusted: results[0]?.sinceAdjusted ?? false };
  }, [view, since, types]);

  const followsNothing = basket.ready && types.length === 0;

  return (
    <main className="page">
      <div>
        <h1 className="title">Поевтинето</h1>
        {view && since ? (
          <p className="lead">
            Следените производи, поевтинети за 5% или повеќе од {shortDate(cards?.sinceUsed ?? since)}
            {cards?.adjusted ? " (почеток на историјата)" : ""}.
          </p>
        ) : (
          <DataStatus />
        )}
      </div>

      <div className={styles.ranges} role="group" aria-label="Од кога">
        {(
          [
            ["visit", "Последна посета"],
            ["7", "7 дена"],
            ["30", "30 дена"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={range === value} className={styles.range} onClick={() => setRange(value)}>
            {label}
          </button>
        ))}
      </div>

      {followsNothing && (
        <section className={`glass ${styles.empty}`}>
          <p>Уште не следиш ништо. Следиме сè што е во твојата кошничка и производите со ѕвезда во Пребарај.</p>
          <p>
            <Link href="/">Кон кошничката</Link> · <Link href="/prebaraj/">Кон пребарувањето</Link>
          </p>
        </section>
      )}

      {cards?.cheapest.map((r) => (
        <section key={r.type.id} className={`glass ${styles.cheapest}`}>
          <div className="eyebrow">Најевтино {shortName(r.type).toLowerCase()} по {UNIT[r.type.unit]}</div>
          <div className={styles.now}>
            <span className={styles.price}>
              {den(r.cheapest.now!.unitPrice)}/{UNIT[r.type.unit]}
            </span>
            <span className={styles.was}>{den(r.cheapest.then!.unitPrice)}</span>
          </div>
          <div className={styles.where}>
            {r.cheapest.now!.offer.name} · {r.cheapest.now!.store.label}
          </div>
        </section>
      ))}

      {cards?.drops.map((c) => (
        <button
          key={`${c.drop.offer.name}|${c.drop.oldPrice}`}
          type="button"
          className={`glass ${styles.card}`}
          onClick={() => setProduct({ storeId: c.stores[0].storeId, storeLabel: c.where, offer: c.drop.offer })}
        >
          <span className={styles.cardHead}>
            <span className="eyebrow">{shortName(c.type)}</span>
            <span className={styles.pct}>−{Math.round(c.pct * 100)}%</span>
          </span>
          <span className={styles.name}>{c.drop.offer.name}</span>
          <span className={styles.now}>
            <span className={styles.price}>{den(c.drop.newPrice)}</span>
            <span className={styles.was}>{den(c.drop.oldPrice)}</span>
          </span>
          <span className={styles.foot}>
            <span>{c.where}</span>
            {c.check.verdict !== "not-on-promo" && (
              <span className={`${styles.badge} ${c.check.verdict === "genuine" ? styles.good : ""}`}>{VERDICT_SHORT[c.check.verdict]}</span>
            )}
          </span>
        </button>
      ))}

      {cards && cards.drops.length === 0 && cards.cheapest.length === 0 && (
        <section className={`glass ${styles.empty}`}>
          <p>
            Ништо од следеното ({types.map((t) => shortName(t).toLowerCase()).join(", ")}) не поевтинело за 5% или повеќе од {shortDate(cards.sinceUsed)}.
          </p>
        </section>
      )}

      <PriceHistorySheet product={product} onClose={() => setProduct(null)} />
    </main>
  );
}
