import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute (Dora P0):
 * - requires login
 * - blocks deleted/inactive accounts
 * - blocks unverified accounts (requires admin verification)
 * - does NOT enforce provider/admin role (use ProviderRoute/AdminRoute for that)
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <FullScreenFallback variant="app" />;
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

  // Check if user is verified (admin must verify before they can sign in)
  // Admin users should bypass verification check
  const userRole = (profile.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  
  if (!isAdmin && profile.is_verified === false) {
    return <Navigate to="/pending-confirmation" replace />;
  }

  return <>{children}</>;
}
