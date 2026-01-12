import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute (Dora P0):
 * - requires login
 * - blocks deleted/inactive accounts
 * - does NOT enforce provider/admin role (use ProviderRoute/AdminRoute for that)
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  // If profile not loaded/created yet, send to profile to complete it
  if (!profile) {
    return <Navigate to="/profile" replace />;
  }

  const st = (profile.status || "").toLowerCase();
  if (st === "deleted" || st === "inactive") {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
