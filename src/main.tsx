import { createRoot } from "react-dom/client";
import App from "./App.tsx";
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
    createRoot(rootEl).render(<App />);
  } catch (error) {
    captureException(error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    showFatal(message);
  }
}
