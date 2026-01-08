import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProviderRouteProps {
  children: React.ReactNode;
}

/**
 * ProviderRoute:
 * - requires login
 * - requires verified
 * - requires provider_status === "approved"
 * - blocks deleted/inactive accounts
 */
export function ProviderRoute({ children }: ProviderRouteProps) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

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

  // If profile missing, send to profile to avoid loops
  if (!profile) {
    return <Navigate to="/profile" replace />;
  }

  if (profile.must_change_password) return <Navigate to="/change-password" replace />;
  if (!profile.is_verified) return <Navigate to="/pending-verification" replace />;

  const st = (profile.status || "").toLowerCase();
  if (st === "deleted" || st === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  const providerStatus = (profile.provider_status || "").toLowerCase();
  if (providerStatus !== "approved") {
    // Not approved yet → go to profile where they can apply / see status
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
