import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";

interface ProviderRouteProps {
  children: React.ReactNode;
}

function isProviderLike(role: string | null | undefined) {
  const r = (role || "").toLowerCase();
  return r === "business" || r === "provider";
}

function isAdmin(role: string | null | undefined) {
  return (role || "").toLowerCase() === "admin";
}

export function ProviderRoute({ children }: ProviderRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return <FullScreenFallback variant="app" />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If the user is authenticated but the profile hasn't resolved yet, don't redirect.
  // This prevents accidental redirects (e.g. to Hub) during brief profile races.
  if (!profile) {
    return <FullScreenFallback variant="app" />;
  }

  const role = profile?.role as any;

  if (!isAdmin(role) && !isProviderLike(role)) {
    return <Navigate to="/profile" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
