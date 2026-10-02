// Културно преземање: искрен User-Agent, тајмаут, повторни обиди и пауза меѓу барања.

// HTTP заглавјата мора да се ASCII, затоа текстот е на латиница. Искрено име и
// намена; без лична е-пошта (одлука 2026-10-02) — контакт е јавната страница.
const USER_AGENT = "kusur-bot/0.1 (sporedba na ceni vo marketi; +https://kusur.online)";
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 3_000;

export const REQUEST_DELAY_MS = 1_000;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Барање со повторни обиди; `read` го чита одговорот (текст, JSON, бајти). */
async function request<T>(url: string, init: RequestInit, read: (res: Response) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "mk-MK,mk;q=0.9,en;q=0.8", ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await read(res);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }
  throw new Error(`Не успеав да го преземам ${url}`, { cause: lastError });
}

export function fetchHtml(url: string): Promise<string> {
  return request(url, { headers: { Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8" } }, (r) => r.text());
}

export function fetchBytes(url: string): Promise<Uint8Array> {
  return request(url, {}, async (r) => new Uint8Array(await r.arrayBuffer()));
}

export function postJson(url: string, body: unknown): Promise<unknown> {
  return request(
    url,
    { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) },
    (r) => r.json(),
  );
}
