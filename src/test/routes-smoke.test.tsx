import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import App from "@/App";

// Mock Supabase to avoid network calls
vi.mock("@/integrations/supabase/client", () => {
  const mockChain = {
    select: () => mockChain,
    insert: () => mockChain,
    update: () => mockChain,
    delete: () => mockChain,
    eq: () => mockChain,
    neq: () => mockChain,
    in: () => mockChain,
    is: () => mockChain,
    or: () => mockChain,
    order: () => mockChain,
    limit: () => mockChain,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
  };
  Object.assign(mockChain, {
    then: (resolve: (r: { data: unknown[]; error: null }) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve as () => void),
  });

  return {
    supabase: {
      from: () => mockChain,
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: () => Promise.resolve({ error: null }),
      },
    },
  };
});

// Mock observability to avoid init side effects
vi.mock("@/observability/sentry", () => ({
  initSentry: () => {},
  captureException: () => {},
}));
vi.mock("@/observability/analytics", () => ({
  initAnalytics: () => {},
  trackPageView: () => {},
  track: () => {},
}));

// Suppress onboarding redirect and set router for route tests
beforeEach(() => {
  // Ensure matchMedia exists (sonner, next-themes need it)
  Object.defineProperty(window, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    writable: true,
    configurable: true,
  });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) =>
      key === "dora_onboarding_done" ? "1" : null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  });
});

afterEach(async () => {
  delete (window as Window & { __TEST_ROUTER_INITIAL_ENTRIES?: string[] }).__TEST_ROUTER_INITIAL_ENTRIES;
  cleanup();
  await new Promise((r) => setTimeout(r, 0));
});

describe("critical routes smoke", () => {
  it("renders /services (Hub) without crashing", async () => {
    (window as Window & { __TEST_ROUTER_INITIAL_ENTRIES?: string[] }).__TEST_ROUTER_INITIAL_ENTRIES = ["/services"];
    render(<App />);
    await waitFor(
      () => {
        expect(document.body.textContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it("renders /buy-sell (Hub) without crashing", async () => {
    (window as Window & { __TEST_ROUTER_INITIAL_ENTRIES?: string[] }).__TEST_ROUTER_INITIAL_ENTRIES = ["/buy-sell"];
    render(<App />);
    await waitFor(
      () => {
        expect(document.body.textContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it("renders /auth without crashing", async () => {
    (window as Window & { __TEST_ROUTER_INITIAL_ENTRIES?: string[] }).__TEST_ROUTER_INITIAL_ENTRIES = ["/auth"];
    render(<App />);
    await waitFor(
      () => {
        expect(document.body.textContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });

  it("renders /about (SitePage) without crashing", async () => {
    (window as Window & { __TEST_ROUTER_INITIAL_ENTRIES?: string[] }).__TEST_ROUTER_INITIAL_ENTRIES = ["/about"];
    render(<App />);
    await waitFor(
      () => {
        expect(document.body.textContent).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});
