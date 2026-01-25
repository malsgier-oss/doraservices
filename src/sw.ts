/* eslint-disable no-restricted-globals */
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { clientsClaim, skipWaiting } from "workbox-core";

declare const self: ServiceWorkerGlobalScope;

// Precache manifest injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
skipWaiting();
clientsClaim();

// --- Push notifications ---
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;
  const data = event.data.json() as { title?: string; body?: string; url?: string } | null;
  const title = data?.title ?? "Dora";
  const body = data?.body ?? "";
  const url = data?.url ?? "/";

  const options: NotificationOptions = {
    body,
    icon: "/lovable-uploads/233227f3-d354-4dc4-992f-9958935db848.png",
    badge: "/lovable-uploads/233227f3-d354-4dc4-992f-9958935db848.png",
    data: { url },
    tag: url,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const w = clientList[0] as WindowClient | undefined;
      if (w && "navigate" in w) return w.navigate(url).then((c) => c?.focus());
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

// --- Background Sync: retry failed requests ---
const DB_NAME = "dora-sync";
const STORE = "queue";
const SYNC_TAG = "dora-retry";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
  });
}

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  ts: number;
}

async function getQueue(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    t.onsuccess = () => resolve(t.result as QueuedRequest[]);
    t.onerror = () => reject(t.error);
  });
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    t.onsuccess = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

self.addEventListener("sync", (event: ExtendableEvent) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    getQueue()
      .then((items) =>
        Promise.all(
          items.map(async (item) => {
            try {
              const res = await fetch(item.url, {
                method: item.method,
                body: item.body ?? undefined,
                headers: { "Content-Type": "application/json", ...item.headers },
              });
              if (res.ok) await removeFromQueue(item.id);
            } catch {
              // keep in queue for next sync
            }
          }),
        ),
      )
      .catch(() => {}),
  );
});
