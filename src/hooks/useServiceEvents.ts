import { supabase } from "@/integrations/supabase/client";

export type ServiceEventType =
  | "view"
  | "call"
  | "whatsapp"
  | "report"
  | "reached"
  | "no_answer";

type LogArgs = {
  event_type: ServiceEventType;
  service_id: string;
  provider_id?: string | null; // claimed provider user_id when available
  user_id?: string | null; // caller id when logged in
};

/**
 * Anonymous-safe event logger.
 * Never throws: failures should not block user actions.
 */
export async function logServiceEvent(args: LogArgs) {
  try {
    // Best-effort: attach logged-in user id if not provided.
    let resolvedUserId: string | null | undefined = args.user_id;
    if (resolvedUserId === undefined) {
      try {
        const { data } = await supabase.auth.getUser();
        resolvedUserId = data.user?.id ?? null;
      } catch {
        resolvedUserId = null;
      }
    }

    const payload = {
      event_type: args.event_type,
      service_id: args.service_id,
      provider_id: args.provider_id ?? null,
      user_id: resolvedUserId ?? null,
    };

    const { error } = await supabase.from("service_events").insert(payload);
    if (error) {
      // swallow silently in production; keep console for debugging
      console.debug("logServiceEvent failed", error);
    }
  } catch (e) {
    console.debug("logServiceEvent exception", e);
  }
}
