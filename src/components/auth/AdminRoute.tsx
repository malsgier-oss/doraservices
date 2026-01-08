import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || profileLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Always enforce password change if required (even for admins)
  if (profile.must_change_password) {
    return <Navigate to="/change-password" replace />;
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

  // Non-admins: apply global access rules
  if (!profile.is_verified) {
    return <Navigate to="/pending-verification" replace />;
  }

  const st = (profile.status || "").toLowerCase();
  if (st === "deleted" || st === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to="/" replace />;
}
