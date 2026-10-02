// Датуми како текст YYYY-MM-DD (датумот на преземање). Само календарска сметка во UTC,
// без часови — нема проблем со летно време.

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
