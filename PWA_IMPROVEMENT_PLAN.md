# App / PWA Improvement Plan

Prioritised ideas to make Dora feel more like a native app and work better on mobile and slow networks.

---

## ✅ Done or in place

- **App shell** – Inline loading shell in `index.html` to avoid a blank white screen.
- **Theme & viewport** – `theme-color` (light/dark), viewport, `viewport-fit=cover` for notches.
- **Cloudflare / MIME** – `_headers` and build output so JS/CSS load correctly.
- **Code splitting** – Route-based lazy loading and `manualChunks` in Vite.
- **Web Share** – Native share on mobile where supported (e.g. deal/service links).
- **RTL / i18n** – Language context and RTL support for Arabic.
- **Service worker** – `vite-plugin-pwa` (injectManifest) + custom `src/sw.ts`: precache, **push**, **background sync**.
- **Push** – SW handles `push` and `notificationclick`. Client: `usePushAndSync`, Profile → Security → Notifications toggle. Optional `VITE_VAPID_PUBLIC_KEY` for subscription; backend must send payloads (e.g. Supabase Edge Function + web-push).
- **Background sync** – Failed requests can be queued with `queueForSync()` from `@/lib/pushAndSync` or `usePushAndSync().queueForSync`. When back online, the SW retries from IndexedDB.

---

## 🔴 High impact (do first)

### 1. Web App Manifest + installability (PWA)

**Goal:** “Add to Home Screen” and app-like window (no browser chrome).

**Add:**

- `public/manifest.webmanifest` with `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, `background_color`, and `icons` (at least 192×192 and 512×512).
- In `index.html`: `<link rel="manifest" href="/manifest.webmanifest">`.
- Optional: `<meta name="apple-mobile-web-app-capable" content="yes">` and `apple-mobile-web-app-status-bar-style`.

**Icons:** Use your brand/logo. Generate 192px and 512px PNGs and put them in `public/` (e.g. `icon-192.png`, `icon-512.png`), then reference them in the manifest. If you only have one asset (e.g. from lovable-uploads), you can reference it as a temporary icon.

---

### 2. Service worker + offline shell

**Goal:** Cached app shell and assets so the UI works on flaky or offline networks.

**Options:**

- **vite-plugin-pwa** (recommended): `npm i -D vite-plugin-pwa`, add to `vite.config.ts`, then build. It will generate a service worker that caches the shell and static assets. You can start with “GenerateSW” and default options.
- **Strategy:** Cache-first for `index.html` + hashed JS/CSS in `/assets/`; network-first or cache-first for API if you add runtime caching later.

**UX:** Optionally show a small “You’re offline – some data may be outdated” bar when `navigator.onLine === false`, and use cached content when possible.

---

### 3. Proper app icons in HTML

**Goal:** Correct icon when saving to home screen or sharing the app.

**In `index.html` `<head>`:**

- `<link rel="icon" href="/favicon.ico" type="image/x-icon">` (and/or favicon in desired sizes).
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (e.g. 180×180).

Use your main Dora logo; keep filenames/paths consistent with what you put in the manifest.

---

## 🟡 Medium impact

### 4. Offline state in the UI

**From CONTEXT_FOR_MOBILE.md:** “Offline state handling”.

- Listen to `window` `online` / `offline` and update a small slice of app state or context.
- In critical flows (e.g. checkout, booking, submitting a form), show a short message if offline and disable or adjust actions that need the network.
- Optionally retry or queue actions when back online (e.g. with a library or a simple queue in state).

---

### 5. Preload critical assets

**Goal:** Slightly faster first paint.

- In `index.html`, add `<link rel="modulepreload" href="…">` for the main entry (Vite can inject this in production; otherwise add it manually for the main chunk).
- Only add preload for one or two critical JS chunks so you don’t delay the rest.

---

### 6. “Add to Home Screen” prompt (optional)

**Goal:** Encourage installs on supported mobile browsers.

- Use the `beforeinstallprompt` event (where available), store the event, and show your own banner or button (“Install Dora”) that calls `prompt()`.
- Don’t show it on every visit; use `localStorage` or a simple heuristic (e.g. after second visit or after a key action) so it doesn’t feel spammy.

---

## 🟢 Nice to have

### 7. Push notifications (later)

- Requires a service worker (from step 2), a backend capable of sending push payloads (e.g. Supabase or your own endpoint), and user permission.
- Use for: booking reminders, new messages, or deals—only if it fits product and privacy.

### 8. Background sync (later)

- With a service worker, you can use the Background Sync API to retry failed requests (e.g. form submits) when the connection returns.
- Helps in areas with unstable connectivity.

### 9. Share target (optional)

- Register as a “share target” in the manifest so other apps can “Share to Dora” (e.g. share a URL into the app).
- Needs `share_target` in `manifest.webmanifest` and a dedicated route/handler in the app.

### 10. Shortcuts in manifest

- Add `shortcuts` in `manifest.webmanifest` (e.g. “Search services”, “My bookings”) so long-press on the home-screen icon shows quick actions.

---

## Order to implement

1. **Manifest + manifest link + app icon links** in `index.html` → install and “standalone” behaviour.
2. **vite-plugin-pwa** and a default service worker → offline shell and cached assets.
3. **Offline UI** (listen to online/offline, show message in critical flows).
4. **Optional:** install prompt, preload, shortcuts, share target, push.

If you say which step you want to do first (e.g. “manifest only” or “manifest + service worker”), the next changes can be concrete file edits and code snippets for this repo.
