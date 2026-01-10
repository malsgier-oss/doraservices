import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProviderRouteProps {
  children: React.ReactNode;
}

/**
 * ProviderRoute (Dora P0):
 * - requires login
 * - requires role === "provider" (or admin)
 * - does NOT block on provider_status (Libya UX: providers can add services immediately)
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

  if (!profile) {
    return <Navigate to="/profile" replace />;
  }

  if (profile.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  const st = (profile.status || "").toLowerCase();
  if (st === "deleted" || st === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  const role = (profile.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isProvider = role === "provider";

  if (!isAdmin && !isProvider) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
