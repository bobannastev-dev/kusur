// Регистар на продавници во Велес. Нова продавница се додава рачно, тука.
// `npm run stores` ги споредува листите во изворите со овој регистар.

import { fetchKam } from "./sources/kam.ts";
import { fetchProverkaNaCeni } from "./sources/proverkanaceni.ts";
import { fetchRamstore } from "./sources/ramstore.ts";
import type { Store } from "./types.ts";

const ZITO = "https://zito.proverkanaceni.mk/";
const STOKOMAK = "https://stokomak.proverkanaceni.mk/";

function zito(id: string, org: number, label: string): Store {
  return { id, chain: "Жито", label, city: "Велес", sourceId: String(org), host: new URL(ZITO).host, fetchOffers: () => fetchProverkaNaCeni(ZITO, org) };
}

function stokomak(id: string, org: number, label: string): Store {
  return { id, chain: "Стокомак", label, city: "Велес", sourceId: String(org), host: new URL(STOKOMAK).host, fetchOffers: () => fetchProverkaNaCeni(STOKOMAK, org) };
}

// КАМ: Id од ShopsWeb/LoadShopList; во листата сите се викаат „Велес", па името е по улица.
function kam(shopId: number, label: string): Store {
  return { id: `kam-veles-${shopId}`, chain: "КАМ", label, city: "Велес", sourceId: String(shopId), host: "kam.com.mk", fetchOffers: () => fetchKam(shopId) };
}

export const STORES: Store[] = [
  // Жито: org од <select> на zito.proverkanaceni.mk. Цените се исти во сите
  // продавници во Велес (проверено 2026-10-01), па се преземаат само трите со
  // најголем асортиман; секоја во повеќе поминувања (види sources/passes.ts).
  zito("zito-veles-centar", 16, "Жито Центар"),
  zito("zito-veles-vane", 9, "Жито Ване"),
  zito("zito-veles-opshtina", 29, "Жито Општина"),

  stokomak("stokomak-veles", 41, "Стокомак Велес"),
  stokomak("stokomak-veles-2", 65, "Стокомак Велес 2"),

  {
    id: "ramstore-veles",
    chain: "Рамстор",
    label: "Рамстор Велес",
    city: "Велес",
    sourceId: "ramstor-veles",
    host: "ramstore.com.mk",
    fetchOffers: () => fetchRamstore("https://ramstore.com.mk/marketi/ramstor-veles/"),
  },

  kam(40, "КАМ 8-ми Септември"), // ул. 8ми Септември бр. 148
  kam(61, "КАМ 11-ти Октомври"), // ул. 11-ти Октомври бб
  kam(94, "КАМ Бауман"), // ул. Алексо Демниевски Бауман бр. 53
];

const SAME_PRICES = "исти цени во Велес; се преземаат само 3-те најголеми продавници на Жито (одлука, 2026-10-01)";

/** Продавници во Велес што постојат во изворите, но свесно не се преземаат. */
export const IGNORED_STORES = [
  { chain: "Жито", sourceId: 10, label: "Жито Ване Кат", reason: "само непрехрана (облека, галантерија), ~4.200 производи" },
  { chain: "Жито", sourceId: 55, label: "Жито Којник", reason: "празен ценовник (0 производи на 2026-10-01)" },
  { chain: "Жито", sourceId: 78, label: "Ла Фамилиа Велес", reason: "главно непрехрана; изоставена со одлука (Checkpoint 2, 2026-10-01)" },
  { chain: "Жито", sourceId: 83, label: "Жито Дос Велес", reason: "изоставена со одлука (Checkpoint 2, 2026-10-01), иако има храна" },
  { chain: "Жито", sourceId: 2, label: "Жито Трговски", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 7, label: "Жито Интернат", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 15, label: "Жито Соколана", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 19, label: "Жито Фонтана", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 20, label: "Жито Багремче", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 37, label: "Жито Градски Саат", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 51, label: "Жито КиМ", reason: SAME_PRICES },
  { chain: "Жито", sourceId: 53, label: "Жито Градинка", reason: SAME_PRICES },
];
