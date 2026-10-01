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
}

export interface Store {
  id: string;
  chain: string;
  label: string;
  city: string;
  fetchOffers: () => Promise<StoreSnapshot>;
}

export interface StoreSnapshot {
  /** Датум и време на последно ажурирање според маркетот, ако е објавено. */
  updatedAt: string | null;
  offers: Offer[];
}

export interface SnapshotFile extends StoreSnapshot {
  storeId: string;
  chain: string;
  label: string;
  city: string;
  fetchedAt: string;
}
