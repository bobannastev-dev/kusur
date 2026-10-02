"use client";

// Кошничката на корисникот: ставки (тип + количина), зачувани во прелистувачот.

import { useEffect, useState } from "react";
import { TYPES_BY_ID } from "../../src/catalog.ts";
import type { BasketLine } from "../../src/list.ts";
import { KEYS, load, save } from "./storage.ts";

interface StoredItem {
  typeId: string;
  need: number;
}

export const EXAMPLE_LIST = "млеко, 10 јајца, сирење, кафе и прашок за перење";

export function useBasket() {
  // null додека не е прочитано од прелистувачот (страницата е однапред изградена).
  const [items, setItems] = useState<StoredItem[] | null>(null);

  useEffect(() => {
    const stored = load<StoredItem[]>(KEYS.basket, []);
    setItems(stored.filter((i) => TYPES_BY_ID.has(i.typeId) && i.need > 0));
  }, []);

  const update = (next: StoredItem[]) => {
    setItems(next);
    save(KEYS.basket, next);
  };

  const lines: BasketLine[] = (items ?? []).map((i) => ({ type: TYPES_BY_ID.get(i.typeId)!, need: i.need }));

  return {
    ready: items !== null,
    lines,
    /** Додава ставки; ист тип се собира. */
    add(added: BasketLine[]) {
      const next = [...(items ?? [])];
      for (const line of added) {
        const existing = next.find((i) => i.typeId === line.type.id);
        if (existing) existing.need = Number((existing.need + line.need).toFixed(3));
        else next.push({ typeId: line.type.id, need: line.need });
      }
      update(next);
    },
    setNeed(typeId: string, need: number) {
      update((items ?? []).map((i) => (i.typeId === typeId ? { ...i, need } : i)));
    },
    remove(typeId: string) {
      update((items ?? []).filter((i) => i.typeId !== typeId));
    },
  };
}
