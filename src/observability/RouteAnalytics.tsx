import React from "react";
import { useLocation } from "react-router-dom";

import { trackPageView } from "@/observability/analytics";

/**
 * SPA pageview tracking (PostHog).
 * No-op unless analytics is configured.
 */
export function RouteAnalytics() {
  const location = useLocation();

  React.useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}

