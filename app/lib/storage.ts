// Лични податоци само во прелистувачот (localStorage): кошничката, следените типови
// и последната посета. Ништо не оди на сервер. localStorage може да го нема или да
// фрли грешка (приватен режим), па секое читање и пишување е заштитено.

const PREFIX = "poevtino:";

export const KEYS = {
  /** Ставките во кошничката: [{ typeId, need }]. */
  basket: "basket",
  /** Рачно следени типови (ѕвезда во Пребарај). */
  followed: "followed",
  /** Датумот на пакетот при претходното отворање на „Поевтинето". */
  lastVisit: "lastVisit",
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Без простор или без дозвола: апликацијата работи и без памтење.
  }
}
