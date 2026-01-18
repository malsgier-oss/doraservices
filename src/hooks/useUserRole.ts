import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Dora P0: profiles.role is constrained in DB to: "user" | "provider" | "admin".
// We keep "business" in the union only for backward-compat with older clients/code.
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
  // "provider" is the canonical provider role.
  // "business" is legacy (older builds) and is treated the same.
  return r === "provider" || r === "business";
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
   * Dora P0: become provider.
   * Dora principle: admin-controlled trust.
   * We set role="provider" and provider_status="pending" (requires admin approval).
   */
  const upgradeToBusiness = async () => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update({
        role: "provider",
        provider_status: "pending",
      })
      .eq("user_id", user.id);

    if (!error) {
      setState({
        roles: ["provider"],
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
