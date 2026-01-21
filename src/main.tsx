import { createRoot } from "react-dom/client";
import "./index.css";
import { initSentry, captureException } from "@/observability/sentry";
import { initAnalytics } from "@/observability/analytics";

const rootEl = document.getElementById("root");

const showFatal = (message: string) => {
  const safeMessage = message || "Unexpected error";
  const html = `
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

if (!rootEl) {
  showFatal("Root element not found");
} else {
  // Observability should be initialized as early as possible.
  initSentry();
  initAnalytics();

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

  window.addEventListener("error", (event) => {
    captureException(event.error || event.message);
    showFatal(event.error?.message || event.message || "Unexpected error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    captureException(reason);
    const message = reason instanceof Error ? reason.message : "Unexpected error";
    showFatal(message);
  });

  try {
    // Import App lazily so startup can show a useful fatal screen if config is missing.
    void import("./App.tsx")
      .then(({ default: App }) => {
        createRoot(rootEl).render(<App />);
      })
      .catch((error) => {
        captureException(error);
        const message = error instanceof Error ? error.message : "Unexpected error";
        showFatal(message);
      });
  } catch (error) {
    captureException(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    showFatal(message);
  }
}
