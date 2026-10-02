"use client";

// Тема: по телефонот, светла или темна. Изборот е во прелистувачот; data-theme на <html>.

import { useEffect, useState } from "react";
import { KEYS, load, save } from "./storage.ts";

export type Theme = "system" | "light" | "dark";

export const THEMES: [Theme, string][] = [
  ["system", "По телефонот"],
  ["light", "Светла"],
  ["dark", "Темна"],
];

function apply(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(load<Theme>(KEYS.theme, "system"));
  }, []);

  return {
    theme,
    set(next: Theme) {
      setTheme(next);
      save(KEYS.theme, next);
      apply(next);
    },
  };
}
