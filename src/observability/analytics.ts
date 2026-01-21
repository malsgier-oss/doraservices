let initialized = false;
let posthog: typeof import("posthog-js").default | null = null;

export function initAnalytics() {
  if (initialized) return;

  const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || "";
  if (!key) return;

  initialized = true;

  const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://app.posthog.com";

  // Lazy-load PostHog so bundles don't pay the cost unless configured.
  void import("posthog-js").then((m) => {
    posthog = m.default;
    posthog.init(key, {
      api_host: apiHost,
      capture_pageview: false, // we'll send SPA page views manually
      autocapture: false,
    });
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  try {
    if (!initialized) initAnalytics();
    if (!posthog || !posthog.__loaded) return;
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}

export function trackPageView(path: string) {
  track("$pageview", { $current_url: path });
}

