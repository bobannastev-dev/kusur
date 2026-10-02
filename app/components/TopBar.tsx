"use client";

// Горна лента: името лево, Поставки десно (тема).

import { useState } from "react";
import { THEMES, useTheme } from "../lib/theme.ts";
import forms from "./Forms.module.css";
import { Sheet } from "./Sheet.tsx";
import styles from "./TopBar.module.css";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const { theme, set } = useTheme();

  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Кусур</span>
      <button type="button" className={`glass ${styles.settings}`} onClick={() => setOpen(true)} aria-label="Поставки">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </svg>
      </button>

      <Sheet open={open} title="Поставки" onClose={() => setOpen(false)}>
        <fieldset className={styles.group}>
          <legend className={forms.label}>Тема</legend>
          <div className={styles.segments}>
            {THEMES.map(([value, label]) => (
              <label key={value} className={styles.segment}>
                <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => set(value)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className={forms.hint}>„По телефонот" ја следи светлата или темната поставка на телефонот.</p>
        </fieldset>
        <p className={forms.hint}>
          Кусур ги споредува цените што маркетите ги објавуваат секој ден. Без сметки: кошничката и поставките остануваат само на овој уред.{" "}
          <a href="https://github.com/bobannastev-dev/kusur">Изворен код</a>
        </p>
      </Sheet>
    </header>
  );
}
