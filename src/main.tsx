import { createRoot } from "react-dom/client";
import "./index.css";
import { initSentry, captureException } from "@/observability/sentry";
import { initAnalytics } from "@/observability/analytics";
import { registerSW } from "virtual:pwa-register";

const rootEl = document.getElementById("root");

const prefetchInitialRoute = () => {
  try {
    const path = window.location?.pathname || "/";
    // Prefetch only the initial screen chunk to reduce Suspense time.
    if (path === "/" || path === "/services" || path === "/buy-sell") void import("./pages/Hub");
    else if (path === "/auth") void import("./pages/Auth");
    else if (path === "/favorites") void import("./pages/Favorites");
    else if (path === "/profile") void import("./pages/Profile");
    else if (path === "/provider-dashboard") void import("./pages/ProviderDashboard");
    else if (path === "/onboarding") void import("./pages/Onboarding");
    else if (path === "/forgot-password") void import("./pages/ForgotPassword");
    else if (path === "/change-password") void import("./pages/ChangePassword");
    else if (path === "/pending-confirmation") void import("./pages/PendingConfirmation");
    else if (path === "/pending-verification") void import("./pages/PendingVerification");
    else if (path.startsWith("/admin")) void import("./pages/admin/AdminLayout");
    else if (
      /^\/(about|contact|help|become-provider|terms|privacy)$/.test(path)
    )
      void import("./pages/SitePage");
  } catch {
    // ignore
  }
};

const removeAppShell = () => {
  try {
    document.getElementById("app-shell")?.remove();
  } catch {
    // ignore
  }
};

/** Treats "Unexpected end of script", failed dynamic import, or ChunkLoadError as chunk load failure. */
const isChunkLoadError = (err: unknown): boolean => {
  if (err == null) return false;
  const msg = typeof err === "object" && err !== null && "message" in err
    ? String((err as Error).message)
    : String(err);
  const name = typeof err === "object" && err !== null && "name" in err
    ? String((err as Error).name)
    : "";
  if (name === "ChunkLoadError") return true;
  const s = msg.toLowerCase();
  if (/unexpected end of script/i.test(s)) return true;
  if (/failed to fetch dynamically imported module/i.test(s)) return true;
  if (/loading chunk [\d]+ failed/i.test(s)) return true;
  return false;
};

const showFatal = (message: string, options?: { chunkLoad?: boolean }) => {
  const safeMessage = message || "Unexpected error";
  const chunkLoad = options?.chunkLoad === true;

  const html = chunkLoad
    ? `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui;">
      <div style="max-width:360px;text-align:center;">
        <div style="font-size:20px;font-weight:600;margin-bottom:8px;">New version available</div>
        <div style="font-size:14px;color:#666;line-height:1.4;margin-bottom:16px;">A new version of the app may be available or a piece of the app failed to load. Please refresh the page.</div>
        <button type="button" onclick="window.location.reload()" style="background:#0f172a;color:#fff;border:0;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">Reload</button>
      </div>
    </div>
  `
    : `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui;">
      <div style="max-width:360px;text-align:center;">
        <div style="font-size:20px;font-weight:600;margin-bottom:8px;">App failed to load</div>
        <div style="font-size:14px;color:#666;line-height:1.4;">${safeMessage}</div>
      </div>
    </div>
  `;

  if (rootEl) {
    rootEl.innerHTML = html;
  } else {
    document.body.innerHTML = html;
  }
};

// Prevent zoom gestures and text selection
const preventZoomAndSelection = () => {
  // Prevent zoom with keyboard shortcuts (Ctrl/Cmd + Plus/Minus/0)
  document.addEventListener("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "0")
    ) {
      e.preventDefault();
      return false;
    }
    // Prevent Ctrl/Cmd + Mouse wheel zoom
    if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.key === "-")) {
      e.preventDefault();
      return false;
    }
  });

  // Prevent zoom with mouse wheel + Ctrl/Cmd
  document.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      return false;
    }
  }, { passive: false });

  // Prevent pinch zoom on touch devices
  let lastTouchDistance = 0;
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastTouchDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  }, { passive: false });

  document.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      return false;
    }
  }, { passive: false });

  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) {
      e.preventDefault();
      return false;
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Prevent text selection via context menu (allow in inputs for copy/paste)
  document.addEventListener("contextmenu", (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // Prevent text selection via drag
  document.addEventListener("selectstart", (e) => {
    const target = e.target as HTMLElement;
    // Allow selection in input fields and textareas
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return true;
    }
    e.preventDefault();
    return false;
  });
};

if (!rootEl) {
  showFatal("Root element not found");
} else {
  // Prevent zoom and text selection as early as possible
  preventZoomAndSelection();
  
  // Observability should be initialized as early as possible.
  initSentry();
  initAnalytics();

  // Register service worker (push + background sync).
  // When a new build is deployed, prompt the user to reload so they get fresh chunk URLs.
  registerSW({
    immediate: true,
    onNeedRefresh() {
      const bar = document.createElement("div");
      bar.setAttribute("aria-live", "polite");
      bar.style.cssText =
        "position:fixed;inset:0 0 auto 0;z-index:9999;background:#0f172a;color:#f1f5f9;padding:10px 16px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font-family:system-ui;font-size:14px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);";
      bar.innerHTML = `
        <span>New version available.</span>
        <button type="button" style="background:#3b82f6;color:#fff;border:0;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Reload</button>
      `;
      const btn = bar.querySelector("button");
      if (btn) {
        btn.addEventListener("click", () => window.location.reload());
      }
      document.body.appendChild(bar);
    },
  });

  const supabaseUrl = import.meta.env.VITE_DORA_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_DORA_SUPABASE_ANON_KEY as string | undefined;

  // If env vars are missing in production (common on first Cloudflare Pages setup),
  // avoid a blank page by showing a fatal error before importing the app bundle.
  if (!supabaseUrl || !supabaseAnonKey) {
    showFatal(
      `Missing required environment variables.
VITE_DORA_SUPABASE_URL set? ${Boolean(supabaseUrl)}
VITE_DORA_SUPABASE_ANON_KEY set? ${Boolean(supabaseAnonKey)}

If you're on Cloudflare Pages, add these as build-time environment variables for the Production environment.`,
    );
    throw new Error("Missing Supabase env vars");
  }

  // Track whether the app has mounted. After mount, only chunk-load errors are fatal;
  // runtime errors are reported to Sentry and left to React error boundaries.
  let appMounted = false;

  window.addEventListener("error", (event) => {
    const err = event.error || event.message;
    captureException(err);
    const chunkLoad = isChunkLoadError(err);
    const isStartup = !appMounted;
    if (chunkLoad || isStartup) {
      const message = err instanceof Error ? err.message : String(err);
      showFatal(message || "Unexpected error", { chunkLoad });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    captureException(reason);
    const chunkLoad = isChunkLoadError(reason);
    const isStartup = !appMounted;
    if (chunkLoad || isStartup) {
      const message = reason instanceof Error ? reason.message : "Unexpected error";
      showFatal(message, { chunkLoad });
    }
  });

  try {
    // Start fetching the initial route chunk while we import the app.
    prefetchInitialRoute();

    // Remove the HTML app shell right before mounting React.
    removeAppShell();

    // Import App lazily so startup can show a useful fatal screen if config is missing.
    void import("./App.tsx")
      .then(({ default: App }) => {
        createRoot(rootEl).render(<App />);
        appMounted = true;
      })
      .catch((error) => {
        captureException(error);
        const message = error instanceof Error ? error.message : "Unexpected error";
        showFatal(message, { chunkLoad: isChunkLoadError(error) });
      });
  } catch (error) {
    captureException(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    showFatal(message, { chunkLoad: isChunkLoadError(error) });
  }
}
