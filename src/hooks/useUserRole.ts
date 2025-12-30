import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "user" | "business";

interface UserRoleState {
  roles: AppRole[];
  loading: boolean;
  isBusiness: boolean;
  isUser: boolean;
}

export function useUserRole() {
  const { user } = useAuth();
  const [state, setState] = useState<UserRoleState>({
    roles: [],
    loading: true,
    isBusiness: false,
    isUser: false,
  });

  useEffect(() => {
    if (!user) {
      setState({ roles: [], loading: false, isBusiness: false, isUser: false });
      return;
    }

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user roles:", error);
        setState({ roles: [], loading: false, isBusiness: false, isUser: false });
        return;
      }

      const roles = (data?.map((r) => r.role) || []) as AppRole[];
      setState({
        roles,
        loading: false,
        isBusiness: roles.includes("business"),
        isUser: roles.includes("user"),
      });
    };

    fetchRoles();
  }, [user]);

  const upgradeToBusiness = async () => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "business" });

    if (!error) {
      setState((prev) => ({
        ...prev,
        roles: [...prev.roles, "business"],
        isBusiness: true,
      }));
    }

    return { error };
  };

  return { ...state, upgradeToBusiness };
}
