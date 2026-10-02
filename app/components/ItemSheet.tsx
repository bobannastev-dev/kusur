"use client";

// Една ставка: количина (−/+) или тргни ја.

import type { BasketLine } from "../../src/list.ts";
import { formatAmount, shortName } from "../lib/format.ts";
import { Sheet } from "./Sheet.tsx";
import styles from "./Forms.module.css";

export function ItemSheet({
  line,
  onClose,
  onNeed,
  onRemove,
}: {
  line: BasketLine | null;
  onClose: () => void;
  onNeed: (need: number) => void;
  onRemove: () => void;
}) {
  const type = line?.type;
  // Чекор = стандардната количина на типот (1 л, 10 јајца, 500 г сирење…).
  const step = type?.defaultAmount ?? 1;
  return (
    <Sheet open={line !== null} title={type ? shortName(type) : ""} onClose={onClose}>
      {line && type && (
        <>
          <p className={styles.hint}>{type.label}</p>
          <div className={styles.stepper}>
            <button type="button" onClick={() => onNeed(Number((line.need - step).toFixed(3)))} disabled={line.need - step <= 0} aria-label="Помалку">
              −
            </button>
            <output aria-live="polite">{formatAmount(line.need, type.unit)}</output>
            <button type="button" onClick={() => onNeed(Number((line.need + step).toFixed(3)))} aria-label="Повеќе">
              +
            </button>
          </div>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => {
              onRemove();
              onClose();
            }}
          >
            Тргни од кошничката
          </button>
        </>
      )}
    </Sheet>
  );
}
