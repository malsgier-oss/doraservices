import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface BusinessRouteProps {
  children: React.ReactNode;
}

export function BusinessRoute({ children }: BusinessRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isBusiness, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isBusiness) {
    return <Navigate to="/profile" state={{ upgradeToBusiness: true }} replace />;
  }

  return <>{children}</>;
}
