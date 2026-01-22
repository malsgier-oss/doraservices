import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";

interface BusinessRouteProps {
  children: React.ReactNode;
}

export function BusinessRoute({ children }: BusinessRouteProps) {
  const { user, loading } = useAuth();
  const { isBusiness, loading: roleLoading } = useUserRole();
  const [hasBusinessRole, setHasBusinessRole] = useState<boolean | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const location = useLocation();

  // Check user_roles table for 'business' role
  useEffect(() => {
    if (!user) {
      setHasBusinessRole(false);
      setCheckingRole(false);
      return;
    }

    let cancelled = false;

    const checkBusinessRole = async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "business")
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error checking business role:", error);
        setHasBusinessRole(false);
      } else {
        setHasBusinessRole(!!data);
      }
      setCheckingRole(false);
    };

    checkBusinessRole();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || roleLoading || checkingRole) {
    return <FullScreenFallback variant="app" />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has business role (from user_roles table) OR provider/business role (from profiles)
  // The plan specifies checking user_roles table, but we also support legacy profiles.role
  const hasRole = hasBusinessRole || isBusiness;

  if (!hasRole) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Allow access even if they don't have a business yet - dashboard will show create form
  return <>{children}</>;
}
