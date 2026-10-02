# Задачи: web-app

План: `tasks/plan.md` · Spec: `SPEC-web-app.md` · Макета: https://claude.ai/artifact/AQCJhGzxbfJwoaqrHReiYi

Секоја задача: тест прво (кога е логика), `npm test` и `npm run typecheck` зелени, commit.

---

## Фаза 1: Податоци за телефонот

- [x] **Задача 1: Логика без `node:fs`**
  - Опис: `cheapestFromCandidates(candidates, need)` и кошничка преку извор на кандидати (`compareBasketWith(stores, lines, maxStores, candidatesFor)`); `dropsSince` / `promoCheck` без увоз на мапите. Постојните `cheapestPurchase`, `compareBasket`, `dropsSince` остануваат со ист потпис (тенки обвивки).
  - Прифаќање:
    - Тест: модулите за телефонот не увезуваат (ни посредно) `node:fs`, `category-map.ts`, `product-map.ts`.
    - Сите постојни тестови непроменети и зелени.
  - Проверка: `npm test`, `npm run typecheck`
  - Зависи од: —
  - Фајлови: `src/match.ts`, `src/basket.ts`, `src/history.ts`, нов `src/purchase.ts` (или сл.), тест
  - Обем: M
  - Направено: без нов модул. `category-map.ts` / `product-map.ts` се само типови; мапите ги чита `defaultTypeMaps()` (type-maps.ts) на првото користење преку `process.getBuiltinModule`, без статички `node:fs`. Нови: `cheapestFromCandidates`, `compareBasketWith(…, candidatesFor)`, `dropsSinceWith(…, candidatesFor)`; старите функции се обвивки. Тест `browser-safe.test.ts` ги следи увозите.

- [ ] **Задача 2: `npm run build-data`**
  - Опис: `src/publish/`: за секој тип × продавница кандидатите (име, цена, редовна, вид на акција, количина, на мерење) + серијата на цени; `stores.json` (продавница, синџир, број, ажурирано, застарено); верзија и датум. Читач на пакетот за телефонот (`fromBundle`) што ги враќа кандидатите во облик за задача 1.
  - Прифаќање:
    - Тест: кошничката од пакетот = `compareBasket` од целосните снимки (синтетички податоци) и на вистинските: 552 Жито Ване / 532 со две.
    - Тест: `dropsSince` / `promoCheck` од пакетот = од целосната историја (синтетички).
    - `types.json` ≤ 2 MB, компресиран ≤ 400 KB (се пишува при `build-data`).
  - Проверка: `npm test`; `npm run build-data`
  - Зависи од: 1
  - Фајлови: `src/publish/build-data.ts`, `src/publish/bundle.ts`, `src/publish/bundle.test.ts`, `package.json`, `.gitignore`
  - Обем: M

### Checkpoint A
- [ ] Критериуми 1–2 од spec-от
- [ ] Големина на пакетот запишана
- [ ] Преглед со човек

---

## Фаза 2: Апликацијата

- [ ] **Задача 3: Next.js основа**
  - Опис: `next`, `react`, `react-dom`; `next.config` (static export); `app/layout.tsx` (Onest, Unbounded, тема по телефонот, CSS променливите од макетата); мени долу (4 екрани, активно, `aria-current`); вчитување на `/data/*.json`; `app/lib/storage.ts`.
  - Прифаќање: `npm run dev` ги покажува 4-те празни екрани со менито во светла и темна тема; увозите од `src/` работат во прелистувач; `npm run build` прави `out/`.
  - Проверка: `npm run dev` (рачно), `npm run build`, `npm run typecheck`
  - Зависи од: 2
  - Фајлови: `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/globals.css`, `app/components/BottomNav.tsx`, `app/lib/data.ts`, `app/lib/storage.ts`
  - Обем: M

- [ ] **Задача 4: Кошничка**
  - Опис: меури (тип + количина), панел за количина/тргни, „+" со пребарување на типовите и залепен список; голема бројка, заштеда, „со 2 продавници", ленти; детали по продавница; чување во `localStorage`; примерен список.
  - Прифаќање: примерниот список дава 552 Жито Ване / 532 со две (како CLI); ставка што ја нема е означена.
  - Проверка: `npm run dev` (рачно, 360 и 430 px, двете теми)
  - Зависи од: 3
  - Фајлови: `app/(tabs)/page.tsx` или `app/page.tsx`, `app/components/Bubbles.tsx`, `app/components/StoreBars.tsx`, …
  - Обем: L

- [ ] **Задача 5: Пребарај**
  - Опис: поле со предлози (алијаси, и латиница); најевтино во Велес + по продавница; производ → историја и „вистинска акција?"; ѕвезда = следи.
  - Прифаќање: „млеко" → 44 ден. Жито (×3) … 52 КАМ (×3), како макетата; ѕвездата се чува.
  - Проверка: `npm run dev` (рачно)
  - Зависи од: 3
  - Фајлови: `app/search/page.tsx`, компоненти
  - Обем: M

- [ ] **Задача 6: Поевтинето**
  - Опис: следени = од кошничката + ѕвезди; последна посета = датумот на пакетот при претходното отворање (првпат: 7 дена); картички со −%, прецртана цена, каде, „вистинска акција?"; празна состојба.
  - Прифаќање: со последна посета 01.10 — Колгејт −42%, Дуел −22% (ако се следат паста/прашок), кафе О‘дор −19%, ориз −14%.
  - Проверка: `npm run dev` (рачно)
  - Зависи од: 3
  - Фајлови: `app/drops/page.tsx`, компоненти
  - Обем: M

- [ ] **Задача 7: Продавници; инсталирање и офлајн**
  - Опис: листа со број производи, ажурирано, „застарено"; извор; `manifest.webmanifest`, икони; последниот пакет офлајн со „цени од <датум>".
  - Прифаќање: апликацијата се додава на почетниот екран; без мрежа ги покажува последните цени.
  - Проверка: рачно на телефон
  - Зависи од: 3
  - Фајлови: `app/stores/page.tsx`, `public/manifest.webmanifest`, икони, мал service worker
  - Обем: M

### Checkpoint B
- [ ] Критериуми 3–5 од spec-от (на твојот телефон)
- [ ] Преглед со човек

---

## Фаза 3: Секојдневно објавување

- [ ] **Задача 8: GitHub Actions + Vercel**
  - Опис: `scripts/data-pack` (архива `data.tar.zst` ↔ `data/`), `.github/workflows/daily.yml` (закажано 08:30 UTC + рачно): враќање од Release `data-latest` (неуспех → стоп, без објава), `npm run fetch` (паднат маркет не го прекинува), зачувување (+ 7 дневни копии), `npm run build`, deploy на Vercel со токен од Secrets.
  - Прифаќање: рачно пуштање објавува нови цени; второ пуштање ја гледа историјата од првото.
  - Проверка: рачно пуштање во GitHub; апликацијата на `*.vercel.app`
  - Зависи од: 3–7; GitHub repo и Vercel сметка (од тебе)
  - Фајлови: `.github/workflows/daily.yml`, `scripts/`, `package.json`
  - Обем: M

### Checkpoint C (модулот готов)
- [ ] Сите 7 критериуми од `SPEC-web-app.md`
- [ ] `/review` (посебен агент)
- [ ] Spec ажуриран ако нешто се сменило
- [ ] Белешката во Second Brain ажурирана
