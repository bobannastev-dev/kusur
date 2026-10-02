"use client";

// Додавање во кошничката: пребарај тип производ, или залепи цел список.

import { useState } from "react";
import { parseList, type BasketLine } from "../../src/list.ts";
import { formatAmount, shortName } from "../lib/format.ts";
import { searchTypes } from "../lib/search.ts";
import { Sheet } from "./Sheet.tsx";
import styles from "./Forms.module.css";

export function AddSheet({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (lines: BasketLine[]) => void }) {
  const [query, setQuery] = useState("");
  const [list, setList] = useState("");
  const [unknown, setUnknown] = useState<string[]>([]);
  const found = searchTypes(query);

  const close = () => {
    setQuery("");
    setList("");
    setUnknown([]);
    onClose();
  };

  return (
    <Sheet open={open} title="Додај во кошничката" onClose={close}>
      <label className={styles.field}>
        <span className="visually-hidden">Производ</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="млеко, кафе, леб…" autoComplete="off" enterKeyHint="search" />
      </label>

      {found.length > 0 && (
        <ul className={styles.options}>
          {found.map((type) => (
            <li key={type.id}>
              <button
                type="button"
                className={styles.option}
                onClick={() => {
                  onAdd([{ type, need: type.defaultAmount }]);
                  close();
                }}
              >
                <span>
                  <strong>{shortName(type)}</strong>
                  <span className={styles.hint}>{type.label}</span>
                </span>
                <span className={styles.hint}>{formatAmount(type.defaultAmount, type.unit)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && found.length === 0 && <p className={styles.hint}>Нема таков производ во списокот на типови.</p>}

      <form
        className={styles.paste}
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = parseList(list);
          if (parsed.lines.length) onAdd(parsed.lines);
          if (parsed.unknown.length) setUnknown(parsed.unknown);
          else close();
          setList("");
        }}
      >
        <label htmlFor="paste-list" className={styles.label}>
          Или залепи цел список
        </label>
        <textarea id="paste-list" rows={3} value={list} onChange={(e) => setList(e.target.value)} placeholder="млеко, 10 јајца, кило сирење…" />
        <button type="submit" className={styles.primary} disabled={!list.trim()}>
          Додај го списокот
        </button>
        {unknown.length > 0 && <p className={styles.hint}>Не препознав: {unknown.join(", ")}. Останатото е додадено.</p>}
      </form>
    </Sheet>
  );
}
