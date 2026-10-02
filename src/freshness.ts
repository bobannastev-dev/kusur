// Свежина на ценовникот: кога маркетот последен пат ги ажурирал цените.
// Законот бара дневно ажурирање; ценовник постар од 2 дена се прикажува со
// предупредување (не се крие — постара цена е подобра од никаква, ако е означена).

const STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Датум и време како што ги пишуваат маркетите:
 * „01/10/2026 19:09" (Жито, Стокомак), „01.10.2026 4:00AM" (Рамстор), „30.09.2026 5:49:22AM" (КАМ).
 * Се толкуваат во локалната временска зона (Македонија).
 */
export function parseSourceDate(text: string | null): Date | null {
  const m = /(\d{1,2})[./](\d{1,2})[./](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(text ?? "");
  if (!m) return null;
  const [, d, mo, y, h, mi, s, ampm] = m;
  let hour = Number(h);
  if (ampm) hour = (hour % 12) + (ampm.toUpperCase() === "PM" ? 12 : 0);

  const date = new Date(Number(y), Number(mo) - 1, Number(d), hour, Number(mi), Number(s ?? 0));
  // „31/02" би станало 3 март — таков датум е грешка, не датум.
  if (date.getDate() !== Number(d) || date.getMonth() !== Number(mo) - 1) return null;
  return date;
}

/** Застарен е ценовник постар од 2 дена од преземањето, или без читлив датум. */
export function isStale(snapshot: { updatedAt: string | null; fetchedAt: string }): boolean {
  const updated = parseSourceDate(snapshot.updatedAt);
  if (!updated) return true;
  return new Date(snapshot.fetchedAt).getTime() - updated.getTime() > STALE_AFTER_MS;
}
