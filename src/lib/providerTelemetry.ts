import { supabase } from "@/integrations/supabase/client";

export type ProviderEventType = "view" | "call" | "whatsapp";

const DEBUG_TAG = "[telemetry][provider]";

async function fallbackInsertEvent(providerId: string, eventType: ProviderEventType) {
  let providerUserId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("services")
      .select("user_id")
      .eq("id", providerId)
      .maybeSingle();
    if (error) throw error;
    providerUserId = data?.user_id ? String(data.user_id) : null;
  } catch (error) {
    console.debug(`${DEBUG_TAG} lookup_failed`, { providerId, eventType, error });
  }

  const { error } = await supabase.from("service_events").insert({
    service_id: providerId,
    event_type: eventType,
    provider_id: providerUserId,
    user_id: null,
  });

  if (error) throw error;
}

/**
 * Best-effort provider telemetry. Never throws.
 * Returns true when any telemetry call succeeds.
 */
export async function trackProviderEvent(providerId: string, eventType: ProviderEventType) {
  if (!providerId) return false;

  try {
    console.debug(`${DEBUG_TAG} rpc_start`, { providerId, eventType });
    const { error } = await supabase.rpc("record_service_event", {
      p_service_id: providerId,
      p_event_type: eventType,
    } as any);
    if (error) throw error;
    console.debug(`${DEBUG_TAG} rpc_ok`, { providerId, eventType });
    return true;
  } catch (error) {
    console.debug(`${DEBUG_TAG} rpc_failed`, { providerId, eventType, error });
  }

  try {
    console.debug(`${DEBUG_TAG} insert_start`, { providerId, eventType });
    await fallbackInsertEvent(providerId, eventType);
    console.debug(`${DEBUG_TAG} insert_ok`, { providerId, eventType });
    return true;
  } catch (error) {
    console.debug(`${DEBUG_TAG} insert_failed`, { providerId, eventType, error });
    return false;
  }
}
