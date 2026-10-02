import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFilePriceStore } from "./price-store-file.ts";
import { priceStoreContract } from "./price-store.contract.ts";

priceStoreContract("датотеки", async () => createFilePriceStore(await mkdtemp(path.join(tmpdir(), "poevtino-"))));


test("датотеки: презапишување преку привремен фајл, без остатоци", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "poevtino-"));
  const store = createFilePriceStore(root);
  const snap = (price: number) => ({
    storeId: "a", chain: "Т", label: "a", city: "Велес", fetchedAt: "", updatedAt: null,
    offers: [{ name: "X", price, regularPrice: null, unitPriceText: "", category: "", description: "", promoKind: null, promoUntil: null }],
  });
  await store.saveSnapshot("2026-10-02", snap(1));
  await store.saveSnapshot("2026-10-02", snap(2));
  assert.equal((await store.latestSnapshot("a"))?.snapshot.offers[0].price, 2);
  assert.deepEqual(await readdir(path.join(root, "snapshots", "2026-10-02")), ["a.json"]);
});

test("датотеки: бришењето ги чисти и остатоците од прекинато запишување во стари денови", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "poevtino-"));
  const store = createFilePriceStore(root);
  const oldDay = path.join(root, "changes", "2026-01-01");
  await mkdir(oldDay, { recursive: true });
  await writeFile(path.join(oldDay, "a.json.123.tmp"), "{");
  assert.equal(await store.pruneChanges("2026-02-01"), 0);
  assert.deepEqual(await readdir(path.join(root, "changes")), []);
});
