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

  // If profile exists, enforce your global rules for access
  if (profile) {
    if (profile.must_change_password) return <Navigate to="/change-password" replace />;
    if (!profile.is_verified) return <Navigate to="/pending-verification" replace />;

    const st = (profile.status || "").toLowerCase();
    if (st === "deleted" || st === "inactive") {
      return <Navigate to="/auth" replace />;
    }
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
