import posthog from "posthog-js";

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  const key = (import.meta.env.VITE_POSTHOG_KEY as string | undefined) || "";
  if (!key) return;

  const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://app.posthog.com";

  posthog.init(key, {
    api_host: apiHost,
    capture_pageview: false, // we'll send SPA page views manually
    autocapture: false,
  });
}

export function track(event: string, properties?: Record<string, unknown>) {
  try {
    if (!initialized) initAnalytics();
    if (!posthog.__loaded) return;
    posthog.capture(event, properties);
  } catch {
    // ignore
  }
}

export function trackPageView(path: string) {
  track("$pageview", { $current_url: path });
}

