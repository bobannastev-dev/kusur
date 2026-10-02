// Модулите што ги користи апликацијата на телефонот не смеат (ни посредно) да увезуваат
// Node модули: прелистувачот нема `node:fs`. Мапите се читаат само во командите.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const BROWSER_ENTRIES = ["basket.ts", "history.ts", "match.ts", "list.ts", "catalog.ts", "parse.ts", "dates.ts", "type-maps.ts", "brands.ts", "publish/bundle.ts"];

/** Статичките увози (не `import type`) на модулот. */
function imports(file: string): string[] {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+"([^"]+)";/gms)].map((m) => m[1]);
}

test("модулите за телефонот не увезуваат Node модули", () => {
  const seen = new Set<string>();
  const offenders: string[] = [];
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const spec of imports(file)) {
      if (spec.startsWith("node:") || !spec.startsWith(".")) offenders.push(`${path.basename(file)} → ${spec}`);
      else visit(path.join(path.dirname(file), spec));
    }
  };
  for (const entry of BROWSER_ENTRIES) visit(path.join(import.meta.dirname, entry));
  assert.deepEqual(offenders, []);
});
