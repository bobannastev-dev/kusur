"use client";

// Ставките во кошничката како меури; поголем меур = поголем дел од сметката.

import type { BasketLine } from "../../src/list.ts";
import { itemLabel } from "../lib/format.ts";
import styles from "./Bubbles.module.css";

export function Bubbles({
  lines,
  costs,
  onPick,
  onAdd,
}: {
  lines: BasketLine[];
  /** Цената на секоја ставка во најдобриот план (за големината); празно додека се пресметува. */
  costs: Map<string, number>;
  onPick: (line: BasketLine) => void;
  onAdd: () => void;
}) {
  const max = Math.max(1, ...costs.values());
  return (
    <ul className={styles.list} aria-label="Ставки во кошничката">
      {lines.map((line) => {
        const { name, amount } = itemLabel(line.type, line.need);
        const share = costs.has(line.type.id) ? Math.sqrt(costs.get(line.type.id)! / max) : 0.5;
        const size = Math.round(78 + 44 * share);
        return (
          <li key={line.type.id}>
            <button
              type="button"
              className={styles.bubble}
              style={{ width: size, height: size }}
              onClick={() => onPick(line)}
              aria-label={`${name}, ${amount} — промени`}
            >
              <span className={styles.name}>{name}</span>
              <span className={styles.amount}>{amount}</span>
            </button>
          </li>
        );
      })}
      <li>
        <button type="button" className={`${styles.bubble} ${styles.add}`} onClick={onAdd} aria-label="Додај производ">
          +
        </button>
      </li>
    </ul>
  );
}
