import assert from "node:assert/strict";
import { mkdtemp, readdir } from "node:fs/promises";
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
