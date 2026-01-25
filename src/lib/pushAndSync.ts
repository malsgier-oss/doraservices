/**
 * Push notifications and Background Sync (client-side helpers).
 * Service worker must be registered first (e.g. via vite-plugin-pwa).
 */

const DB_NAME = "dora-sync";
const STORE = "queue";
const SYNC_TAG = "dora-retry";

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
  ts: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
  });
}

/**
 * Queue a failed request for Background Sync. Call when a mutation fails due to network.
 * When the device is back online, the service worker will retry.
 */
export async function queueForBackgroundSync(params: {
  url: string;
  method: string;
  body?: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  const regProto = typeof ServiceWorkerRegistration !== "undefined" ? ServiceWorkerRegistration.prototype : null;
  if (!("serviceWorker" in navigator) || !regProto || !("sync" in regProto)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const id = `retry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: QueuedRequest = {
      id,
      url: params.url,
      method: params.method,
      body: params.body,
      headers: params.headers,
      ts: Date.now(),
    };
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite").objectStore(STORE).add(item);
      t.onsuccess = () => resolve();
      t.onerror = () => reject(t.error);
    });
    await reg.sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

export type PushPermission = "default" | "granted" | "denied";

/**
 * Request permission and subscribe to push. Pass VAPID public key (optional).
 * If VITE_VAPID_PUBLIC_KEY is set, use it; otherwise subscription may still work on some browsers.
 */
export async function subscribePush(vapidPublicKey?: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return null;

    const options: PushSubscriptionOptionsInit = { userVisibleOnly: true };
    if (vapidPublicKey) {
      try {
        const key = urlBase64ToUint8Array(vapidPublicKey);
        options.applicationServerKey = key;
      } catch {
        // ignore invalid key
      }
    }

    const sub = await reg.pushManager.subscribe(options);
    return sub;
  } catch {
    return null;
  }
}

/**
 * Get current push permission state.
 */
export function getPushPermission(): PushPermission {
  if (!("Notification" in window)) return "denied";
  return Notification.permission as PushPermission;
}

/**
 * Unsubscribe from push (e.g. in settings).
 */
export async function unsubscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    return true;
  } catch {
    return false;
  }
}

/**
 * Serialise a PushSubscription for sending to your backend (for sending push later).
 */
export function serializeSubscription(sub: PushSubscription): Record<string, unknown> {
  return sub.toJSON();
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const _regProto =
  typeof navigator !== "undefined" && typeof ServiceWorkerRegistration !== "undefined"
    ? ServiceWorkerRegistration.prototype
    : null;
export const PUSH_SYNC_SUPPORTED =
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  !!_regProto &&
  "sync" in _regProto;
