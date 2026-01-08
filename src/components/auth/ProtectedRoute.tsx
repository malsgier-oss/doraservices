import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const status = (profile?.status || "").toLowerCase();
    if (user && profile && (status === "deleted" || status === "inactive")) {
      signOut?.();
    }
  }, [user, profile, signOut]);

  if (loading || profileLoading) {
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

  const status = (profile.status || "").toLowerCase();
  const role = (profile.role || "").toLowerCase();

  if (status === "deleted" || status === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  // Always enforce password change if required (even for admins)
  if (profile.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Verification gating should not block admins
  if (!profile.is_verified && role !== "admin" && location.pathname !== "/pending-verification") {
    return <Navigate to="/pending-verification" replace />;
  }

  return <>{children}</>;
}
