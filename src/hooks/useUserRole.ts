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
      setState({ roles: [], loading: false, isBusiness: false, isUser: false, isAdmin: false });
      return () => {
        cancelled = true;
      };
    }

    // Important: ensure AdminRoute waits for roles when user becomes available
    setState((prev) => ({ ...prev, loading: true }));

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (error) {
        console.error("Error fetching user roles:", error);
        setState({ roles: [], loading: false, isBusiness: false, isUser: false, isAdmin: false });
        return;
      }

      const roles = (data?.map((r) => r.role) || []) as AppRole[];
      setState({
        roles,
        loading: false,
        isBusiness: roles.includes("business"),
        isUser: roles.includes("user"),
        isAdmin: roles.includes("admin"),
      });
    };

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const upgradeToBusiness = async () => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "business" });

    if (!error) {
      setState((prev) => ({
        ...prev,
        roles: [...prev.roles, "business"] as AppRole[],
        isBusiness: true,
      }));
    }

    return { error };
  };

  return { ...state, upgradeToBusiness };
}
