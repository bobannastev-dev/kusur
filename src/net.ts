// Културно преземање: искрен User-Agent, тајмаут, повторни обиди и пауза меѓу барања.

// HTTP заглавјата мора да се ASCII, затоа текстот е на латиница.
const USER_AGENT = "poevtino-bot/0.1 (sporedba na ceni; kontakt: )";
const TIMEOUT_MS = 90_000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 3_000;

export const REQUEST_DELAY_MS = 1_000;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchHtml(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "mk-MK,mk;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }
  throw new Error(`Не успеав да го преземам ${url}`, { cause: lastError });
}
