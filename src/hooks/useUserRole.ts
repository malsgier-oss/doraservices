import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// DB enum (generated types) currently uses: "user" | "business" | "admin".
// We also accept legacy "provider" reads (older rows / older clients).
export type AppRole = "user" | "business" | "admin" | "provider";

interface UserRoleState {
  roles: AppRole[];
  loading: boolean;
  isBusiness: boolean;
  isUser: boolean;
  isAdmin: boolean;
}

function isBusinessRole(role: string | null | undefined) {
  const r = (role || "").toLowerCase();
  return r === "business" || r === "provider";
}

export function useUserRole() {
  const { user } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    roles: [],
    loading: true,
    isBusiness: false,
    isUser: false,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setState({
        roles: [],
        loading: false,
        isBusiness: false,
        isUser: false,
        isAdmin: false,
      });
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({ ...prev, loading: true }));

    const fetchRole = async () => {
      const { data, error } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error fetching user role from profiles:", error);
        setState({
          roles: [],
          loading: false,
          isBusiness: false,
          isUser: false,
          isAdmin: false,
        });
        return;
      }

      const rawRole = (data?.role as string | null) || "user";
      const role = (rawRole as AppRole) || "user";
      const roles: AppRole[] = [role];

      setState({
        roles,
        loading: false,
        isBusiness: isBusinessRole(role),
        isUser: (role || "").toLowerCase() === "user",
        isAdmin: (role || "").toLowerCase() === "admin",
      });
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /**
   * Dora P0: become provider immediately.
   * We set role="business" and provider_status="approved".
   */
  const upgradeToBusiness = async () => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update({
        role: "business",
        provider_status: "approved",
      })
      .eq("user_id", user.id);

    if (!error) {
      setState({
        roles: ["business"],
        loading: false,
        isBusiness: true,
        isUser: false,
        isAdmin: false,
      });
    }

    return { error };
  };

  return { ...state, upgradeToBusiness };
}
