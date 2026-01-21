import * as Sentry from "@sentry/react";

function parseNumber(v: unknown, fallback: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function initSentry() {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || "";
  if (!dsn) return;

  const environment = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE;
  const tracesSampleRate = parseNumber(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.05);

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate,
    // Keep defaults minimal; we can add integrations (replay/routing) later.
  });
}

export function captureException(error: unknown) {
  try {
    Sentry.captureException(error);
  } catch {
    // ignore
  }
}

