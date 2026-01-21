function parseNumber(v: unknown, fallback: number) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : fallback;
}

let sentry: typeof import("@sentry/react") | null = null;

export function initSentry() {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || "";
  if (!dsn) return;

  const environment = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE;
  const tracesSampleRate = parseNumber(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.05);

  // Lazy-load Sentry so production bundles don't pay the cost unless configured.
  void import("@sentry/react").then((m) => {
    sentry = m;
    m.init({
      dsn,
      environment,
      tracesSampleRate,
      // Keep defaults minimal; we can add integrations (replay/routing) later.
    });
  });
}

export function captureException(error: unknown) {
  try {
    sentry?.captureException(error);
  } catch {
    // ignore
  }
}

