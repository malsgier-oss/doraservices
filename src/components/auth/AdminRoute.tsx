import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || profileLoading || roleLoading) {
    return <FullScreenFallback variant="app" />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If the user is an admin, allow access even if the account is not verified yet.
  // (Admins are not subject to provider verification gating.)
  if (isAdmin || (profile.role || "").toLowerCase() === "admin") {
    const st = (profile.status || "").toLowerCase();
    if (st === "deleted" || st === "inactive") {
      return <Navigate to="/auth" replace />;
    }

    return <>{children}</>;
  }

  const st = (profile.status || "").toLowerCase();
  if (st === "deleted" || st === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to="/" replace />;
}
