import assert from "node:assert/strict";
import { test } from "node:test";
import { isStale, parseSourceDate } from "./freshness.ts";

test("датуми како што ги пишуваат маркетите", () => {
  // Жито, Стокомак: „01/10/2026 19:09"
  assert.deepEqual(parseSourceDate("01/10/2026 19:09"), new Date(2026, 9, 1, 19, 9));
  // Рамстор: „01.10.2026 4:00AM"
  assert.deepEqual(parseSourceDate("01.10.2026 4:00AM"), new Date(2026, 9, 1, 4, 0));
  // КАМ: „30.09.2026 5:49:22AM"
  assert.deepEqual(parseSourceDate("30.09.2026 5:49:22AM"), new Date(2026, 8, 30, 5, 49, 22));
  // PM и 12 часот
  assert.deepEqual(parseSourceDate("01.10.2026 1:15PM"), new Date(2026, 9, 1, 13, 15));
  assert.deepEqual(parseSourceDate("01.10.2026 12:05AM"), new Date(2026, 9, 1, 0, 5));
  assert.deepEqual(parseSourceDate("01.10.2026 12:05PM"), new Date(2026, 9, 1, 12, 5));
});

test("нечитлив датум", () => {
  assert.equal(parseSourceDate(null), null);
  assert.equal(parseSourceDate(""), null);
  assert.equal(parseSourceDate("непознато"), null);
  assert.equal(parseSourceDate("31/02/2026 10:00"), null); // нема 31 февруари
});

const snap = (updatedAt: string | null, fetchedAt: string) => ({ updatedAt, fetchedAt });

test("застарен: постар од 2 дена од преземањето или без датум", () => {
  const fetched = new Date(2026, 9, 2, 5, 0).toISOString();
  assert.equal(isStale(snap("01/10/2026 19:09", fetched)), false); // вчера
  assert.equal(isStale(snap("30.09.2026 5:49:22AM", fetched)), false); // 47 часа — уште свеж
  assert.equal(isStale(snap("29.09.2026 7:00AM", fetched)), true); // над 2 дена
  assert.equal(isStale(snap(null, fetched)), true);
  assert.equal(isStale(snap("непознато", fetched)), true);
});
