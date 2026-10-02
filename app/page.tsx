"use client";

// Кошничка: што купувам → каде е најевтино, и дали вреди втора продавница.

import { useMemo, useState } from "react";
import { compareBasketWith } from "../src/basket.ts";
import { parseList } from "../src/list.ts";
import { AddSheet } from "./components/AddSheet.tsx";
import { BasketResult } from "./components/BasketResult.tsx";
import { Bubbles } from "./components/Bubbles.tsx";
import { DataStatus } from "./components/DataStatus.tsx";
import { ItemSheet } from "./components/ItemSheet.tsx";
import styles from "./components/Forms.module.css";
import { EXAMPLE_LIST, useBasket } from "./lib/basket.ts";
import { shortDate, usePriceData } from "./lib/data.tsx";

export default function BasketPage() {
  const data = usePriceData();
  const basket = useBasket();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const key = basket.lines.map((l) => `${l.type.id}:${l.need}`).join(",");
  const result = useMemo(() => {
    if (data.status !== "ready" || basket.lines.length === 0) return null;
    return compareBasketWith(data.view.stores, basket.lines, 2, data.view.candidatesFor);
    // Кошничката се споредува по содржина (key), не по нова низа при секое прикажување.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key]);

  const costs = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of result?.best.items ?? []) if (item.purchase) map.set(item.line.type.id, item.purchase.cost);
    return map;
  }, [result]);

  const editingLine = basket.lines.find((l) => l.type.id === editing) ?? null;

  return (
    <main className="page">
      <div>
        <h1 className="title">Твојата кошничка</h1>
        {basket.lines.length > 0 ? <p className="lead">Допри производ за количина, или додај нов.</p> : <DataStatus />}
      </div>

      {basket.ready && basket.lines.length === 0 && (
        <section className="glass" style={{ borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 16 }}>Додај што купуваш, а ние ќе ти кажеме во која продавница во Велес е најевтина целата кошничка.</p>
          <button type="button" className={styles.primary} onClick={() => setAdding(true)}>
            Додај производ
          </button>
          <button type="button" className={styles.secondary} onClick={() => basket.add(parseList(EXAMPLE_LIST).lines)}>
            Пробај со пример: {EXAMPLE_LIST}
          </button>
        </section>
      )}

      {basket.lines.length > 0 && <Bubbles lines={basket.lines} costs={costs} onPick={(l) => setEditing(l.type.id)} onAdd={() => setAdding(true)} />}

      {basket.lines.length > 0 && data.status !== "ready" && <DataStatus />}
      {result && data.status === "ready" && <BasketResult result={result} date={shortDate(data.view.bundle.date)} />}

      <AddSheet open={adding} onClose={() => setAdding(false)} onAdd={basket.add} />
      <ItemSheet
        line={editingLine}
        onClose={() => setEditing(null)}
        onNeed={(need) => editingLine && basket.setNeed(editingLine.type.id, need)}
        onRemove={() => editingLine && basket.remove(editingLine.type.id)}
      />
    </main>
  );
}
