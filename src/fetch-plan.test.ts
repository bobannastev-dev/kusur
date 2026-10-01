import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByHost, runByHost } from "./fetch-plan.ts";

const stores = [
  { id: "z1", host: "zito.proverkanaceni.mk" },
  { id: "s1", host: "stokomak.proverkanaceni.mk" },
  { id: "z2", host: "zito.proverkanaceni.mk" },
  { id: "k1", host: "kam.com.mk" },
  { id: "z3", host: "zito.proverkanaceni.mk" },
];

test("групирање по сервер, во редоследот од регистарот", () => {
  const groups = groupByHost(stores);
  assert.deepEqual(
    [...groups].map(([host, list]) => [host, list.map((s) => s.id)]),
    [
      ["zito.proverkanaceni.mk", ["z1", "z2", "z3"]],
      ["stokomak.proverkanaceni.mk", ["s1"]],
      ["kam.com.mk", ["k1"]],
    ],
  );
});

test("најмногу една продавница истовремено по сервер, различни сервери паралелно", async () => {
  const running = new Map<string, number>();
  let maxSameHost = 0;
  let maxTotal = 0;
  const order: string[] = [];

  await runByHost(
    stores,
    async (s) => {
      running.set(s.host, (running.get(s.host) ?? 0) + 1);
      maxSameHost = Math.max(maxSameHost, ...running.values());
      maxTotal = Math.max(maxTotal, [...running.values()].reduce((a, b) => a + b, 0));
      await new Promise((r) => setTimeout(r, 15));
      running.set(s.host, running.get(s.host)! - 1);
      order.push(s.id);
    },
    0,
  );

  assert.equal(maxSameHost, 1);
  assert.equal(maxTotal, 3); // три различни сервери во исто време
  assert.deepEqual(order.filter((id) => id.startsWith("z")), ["z1", "z2", "z3"]);
});

test("грешка во една продавница не ги запира другите од истиот сервер", async () => {
  const done: string[] = [];
  const results = await runByHost(
    stores,
    async (s) => {
      if (s.id === "z2") throw new Error("пад");
      done.push(s.id);
    },
    0,
  );
  assert.deepEqual(done.sort(), ["k1", "s1", "z1", "z3"]);
  assert.equal(results.filter((r) => r.error).length, 1);
  assert.equal(results.find((r) => r.error)?.store.id, "z2");
});
