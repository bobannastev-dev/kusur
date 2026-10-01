// Регистар на продавници. Почнуваме со еден град (Велес) и по една продавница
// од синџир — нова продавница е еден ред тука.

import { fetchProverkaNaCeni } from "./sources/proverkanaceni.ts";
import { fetchRamstore } from "./sources/ramstore.ts";
import type { Store } from "./types.ts";

export const STORES: Store[] = [
  {
    id: "zito-veles-trgovski",
    chain: "Жито",
    label: "Жито Трговски",
    city: "Велес",
    fetchOffers: () => fetchProverkaNaCeni("https://zito.proverkanaceni.mk/", 2),
  },
  {
    id: "stokomak-veles",
    chain: "Стокомак",
    label: "Стокомак Велес",
    city: "Велес",
    fetchOffers: () => fetchProverkaNaCeni("https://stokomak.proverkanaceni.mk/", 41),
  },
  {
    id: "ramstore-veles",
    chain: "Рамстор",
    label: "Рамстор Велес",
    city: "Велес",
    fetchOffers: () => fetchRamstore("https://ramstore.com.mk/marketi/ramstor-veles/"),
  },
];
