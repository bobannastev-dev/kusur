// Регистар на продавници. Почнуваме со еден град (Велес) и по една продавница
// од синџир — нова продавница е еден ред тука.

import { fetchKam } from "./sources/kam.ts";
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
  // КАМ: Id од ShopsWeb/LoadShopList; во листата сите три се викаат „Велес", па името е по улица.
  {
    id: "kam-veles-40",
    chain: "КАМ",
    label: "КАМ 8-ми Септември",
    city: "Велес",
    fetchOffers: () => fetchKam(40), // ул. 8ми Септември бр. 148
  },
  {
    id: "kam-veles-61",
    chain: "КАМ",
    label: "КАМ 11-ти Октомври",
    city: "Велес",
    fetchOffers: () => fetchKam(61), // ул. 11-ти Октомври бб
  },
  {
    id: "kam-veles-94",
    chain: "КАМ",
    label: "КАМ Бауман",
    city: "Велес",
    fetchOffers: () => fetchKam(94), // ул. Алексо Демниевски Бауман бр. 53
  },
];
