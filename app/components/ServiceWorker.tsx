"use client";

// Го регистрира service worker-от (само во објавената апликација, не во npm run dev).

import { useEffect } from "react";

export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Без service worker апликацијата работи, само не и без интернет.
    });
  }, []);
  return null;
}
