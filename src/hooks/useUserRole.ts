import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "user" | "business" | "admin";

interface UserRoleState {
  roles: AppRole[];
  loading: boolean;
  isBusiness: boolean;
  isUser: boolean;
  isAdmin: boolean;
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

    // Ensure guards wait for role fetch after login
    setState((prev) => ({ ...prev, loading: true }));

    const fetchRole = async () => {
      // Read role from profiles (single source of truth)
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

      // If no profile or no role, default to "user"
      const role = ((data?.role as AppRole) || "user") as AppRole;

      const roles: AppRole[] = [role];

      setState({
        roles,
        loading: false,
        isBusiness: role === "business",
        isUser: role === "user",
        isAdmin: role === "admin",
      });
    };

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const upgradeToBusiness = async () => {
    if (!user) return { error: new Error("Not authenticated") };

    // Update role in profiles (NOT user_roles)
    const { error } = await supabase.from("profiles").update({ role: "business" }).eq("user_id", user.id);

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
