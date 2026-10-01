// Регистар на продавници во Велес. Нова продавница се додава рачно, тука.
// `npm run stores` ги споредува листите во изворите со овој регистар.

import { fetchKam } from "./sources/kam.ts";
import { fetchProverkaNaCeni } from "./sources/proverkanaceni.ts";
import { fetchRamstore } from "./sources/ramstore.ts";
import type { Store } from "./types.ts";

const ZITO = "https://zito.proverkanaceni.mk/";
const STOKOMAK = "https://stokomak.proverkanaceni.mk/";

function zito(id: string, org: number, label: string): Store {
  return { id, chain: "Жито", label, city: "Велес", host: new URL(ZITO).host, fetchOffers: () => fetchProverkaNaCeni(ZITO, org) };
}

function stokomak(id: string, org: number, label: string): Store {
  return { id, chain: "Стокомак", label, city: "Велес", host: new URL(STOKOMAK).host, fetchOffers: () => fetchProverkaNaCeni(STOKOMAK, org) };
}

// КАМ: Id од ShopsWeb/LoadShopList; во листата сите се викаат „Велес", па името е по улица.
function kam(shopId: number, label: string): Store {
  return { id: `kam-veles-${shopId}`, chain: "КАМ", label, city: "Велес", host: "kam.com.mk", fetchOffers: () => fetchKam(shopId) };
}

export const STORES: Store[] = [
  // Жито: org од <select> на zito.proverkanaceni.mk. Цените се исти во сите
  // продавници во Велес (проверено 2026-10-01), се разликува асортиманот.
  zito("zito-veles-trgovski", 2, "Жито Трговски"),
  zito("zito-veles-internat", 7, "Жито Интернат"),
  zito("zito-veles-vane", 9, "Жито Ване"),
  zito("zito-veles-sokolana", 15, "Жито Соколана"),
  zito("zito-veles-centar", 16, "Жито Центар"),
  zito("zito-veles-fontana", 19, "Жито Фонтана"),
  zito("zito-veles-bagremche", 20, "Жито Багремче"),
  zito("zito-veles-opshtina", 29, "Жито Општина"),
  zito("zito-veles-gradski-saat", 37, "Жито Градски Саат"),
  zito("zito-veles-kim", 51, "Жито КиМ"),
  zito("zito-veles-gradinka", 53, "Жито Градинка"),

  stokomak("stokomak-veles", 41, "Стокомак Велес"),
  stokomak("stokomak-veles-2", 65, "Стокомак Велес 2"),

  {
    id: "ramstore-veles",
    chain: "Рамстор",
    label: "Рамстор Велес",
    city: "Велес",
    host: "ramstore.com.mk",
    fetchOffers: () => fetchRamstore("https://ramstore.com.mk/marketi/ramstor-veles/"),
  },

  kam(40, "КАМ 8-ми Септември"), // ул. 8ми Септември бр. 148
  kam(61, "КАМ 11-ти Октомври"), // ул. 11-ти Октомври бб
  kam(94, "КАМ Бауман"), // ул. Алексо Демниевски Бауман бр. 53
];

/** Продавници во Велес што постојат во изворите, но свесно не се преземаат. */
export const IGNORED_STORES = [
  { chain: "Жито", sourceId: 10, label: "Жито Ване Кат", reason: "само непрехрана (облека, галантерија), ~4.200 производи" },
  { chain: "Жито", sourceId: 55, label: "Жито Којник", reason: "празен ценовник (0 производи на 2026-10-01)" },
];
