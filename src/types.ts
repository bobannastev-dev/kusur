export type Unit = "kg" | "l" | "pc";

/** Еден ред од ценовникот на една продавница. */
export interface Offer {
  name: string;
  /** Продажна цена во денари (она што се плаќа на каса). */
  price: number;
  /** Редовна цена, ако е објавена; `price < regularPrice` значи акција. */
  regularPrice: number | null;
  /** Единечна цена како што ја објавил маркетот, пр. „1кгр = 142.00 ден." */
  unitPriceText: string;
  /** Категорија според маркетот (колоната „Опис на стока"). */
  category: string;
  /** „Опис на стока" кога маркетот таму пишува опис, а не категорија (КАМ); инаку празно. */
  description: string;
  /** Траење на акцијата како што е објавено („25.09.2026 до 09.10.2026"), без толкување. */
  promoUntil: string | null;
}

export interface Store {
  id: string;
  chain: string;
  label: string;
  city: string;
  /** Ид во изворот: org кај Жито/Стокомак, slug кај Рамстор, Id кај КАМ. */
  sourceId: string;
  /** Серверот од кој се презема; продавниците на ист сервер се преземаат една по една. */
  host: string;
  fetchOffers: () => Promise<StoreSnapshot>;
}

export interface StoreSnapshot {
  /** Датум и време на последно ажурирање според маркетот, ако е објавено. */
  updatedAt: string | null;
  offers: Offer[];
  /** Кај извори со повеќе поминувања: колку производи објавува изворот и колку поминувања требале. */
  completeness?: { expected: number; passes: number };
}

export interface SnapshotFile extends StoreSnapshot {
  storeId: string;
  chain: string;
  label: string;
  city: string;
  fetchedAt: string;
}
