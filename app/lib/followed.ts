"use client";

// Рачно следени типови (ѕвезда во Пребарај); за „Поевтинето" се додаваат и типовите од кошничката.

import { useEffect, useState } from "react";
import { TYPES_BY_ID } from "../../src/catalog.ts";
import { KEYS, load, save } from "./storage.ts";

export function useFollowed() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(load<string[]>(KEYS.followed, []).filter((id) => TYPES_BY_ID.has(id)));
  }, []);

  return {
    ids,
    isFollowed: (id: string) => ids.includes(id),
    toggle(id: string) {
      const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      setIds(next);
      save(KEYS.followed, next);
    },
  };
}
