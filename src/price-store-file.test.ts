import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createFilePriceStore } from "./price-store-file.ts";
import { priceStoreContract } from "./price-store.contract.ts";

priceStoreContract("датотеки", async () => createFilePriceStore(await mkdtemp(path.join(tmpdir(), "poevtino-"))));
