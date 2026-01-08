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

  // If the account is soft-deleted, sign them out immediately
  useEffect(() => {
    const status = (profile?.status || "").toLowerCase();
    if (user && profile && (status === "deleted" || status === "inactive")) {
      // fire-and-forget sign out (don’t block render)
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

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Logged in but profile missing (usually RLS select blocked)
  // Better to redirect to /auth than allow protected screens to crash.
  if (!profile) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const status = (profile.status || "").toLowerCase();

  // Soft-deleted / inactive account
  if (status === "deleted" || status === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  // Force password change
  if (profile.must_change_password) {
    // Avoid redirect loop if already on change-password
    if (location.pathname !== "/change-password") {
      return <Navigate to="/change-password" replace />;
    }
  }

  // Verification gate
  if (!profile.is_verified) {
    // Avoid redirect loop if already on pending-verification
    if (location.pathname !== "/pending-verification") {
      return <Navigate to="/pending-verification" replace />;
    }
  }

  return <>{children}</>;
}
