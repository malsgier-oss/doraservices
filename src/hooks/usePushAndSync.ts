import { useCallback, useEffect, useState } from "react";
import {
  PUSH_SYNC_SUPPORTED,
  getPushPermission,
  queueForBackgroundSync,
  subscribePush,
  unsubscribePush,
  type PushPermission,
} from "@/lib/pushAndSync";

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function usePushAndSync() {
  const [pushPermission, setPushPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);

  const updatePermission = useCallback(() => {
    setPushPermission(getPushPermission());
  }, []);

  useEffect(() => {
    updatePermission();
    if (!PUSH_SYNC_SUPPORTED) return;
    const check = async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    };
    check();
  }, [updatePermission]);

  const requestPushSubscription = useCallback(async (): Promise<boolean> => {
    if (!PUSH_SYNC_SUPPORTED) return false;
    const sub = await subscribePush(VAPID_KEY);
    setIsSubscribed(!!sub);
    updatePermission();
    if (sub) {
      // Send subscription to your backend so you can push later (e.g. Supabase Edge Function).
      // const payload = serializeSubscription(sub);
      // await fetch('/api/push-subscribe', { method: 'POST', body: JSON.stringify(payload) });
    }
    return !!sub;
  }, [updatePermission]);

  const turnOffPush = useCallback(async (): Promise<boolean> => {
    const ok = await unsubscribePush();
    if (ok) {
      setIsSubscribed(false);
      updatePermission();
    }
    return ok;
  }, [updatePermission]);

  const queueForSync = useCallback(
    (params: { url: string; method: string; body?: string; headers?: Record<string, string> }) =>
      queueForBackgroundSync(params),
    [],
  );

  return {
    supported: PUSH_SYNC_SUPPORTED,
    pushPermission,
    isSubscribed: isSubscribed ?? false,
    requestPushSubscription,
    turnOffPush,
    queueForSync,
    updatePermission,
  };
}
