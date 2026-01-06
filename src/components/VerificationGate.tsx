import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

interface VerificationGateProps {
  children: ReactNode;
  action?: "call" | "whatsapp" | "review" | "service";
  onBlocked?: () => void;
}

/**
 * Component that gates actions requiring verification.
 * Wraps clickable elements and shows dialog if user is not verified.
 */
export function VerificationGate({ children, action = "call", onBlocked }: VerificationGateProps) {
  const { user, profile, signOut } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  const isVerified = profile?.is_verified === true;

  const handleClick = (e: React.MouseEvent) => {
    // If not logged in, redirect to auth
    if (!user) {
      e.preventDefault();
      e.stopPropagation();
      navigate("/auth");
      return;
    }

    // If not verified, show dialog
    if (!isVerified) {
      e.preventDefault();
      e.stopPropagation();
      setShowDialog(true);
      onBlocked?.();
      return;
    }

    // Otherwise, let the click through
  };

  const handleLogout = async () => {
    await signOut();
    setShowDialog(false);
    navigate("/auth");
  };

  const getActionText = () => {
    switch (action) {
      case "call":
        return isRTL ? "الاتصال بمقدمي الخدمات" : "calling providers";
      case "whatsapp":
        return isRTL ? "التواصل عبر واتساب" : "WhatsApp contact";
      case "review":
        return isRTL ? "إضافة التقييمات" : "adding reviews";
      case "service":
        return isRTL ? "إضافة الخدمات" : "adding services";
      default:
        return isRTL ? "هذا الإجراء" : "this action";
    }
  };

  return (
    <>
      <div onClick={handleClick} className="contents">
        {children}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <DialogTitle>
              {isRTL ? "في انتظار التحقق" : "Pending Verification"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isRTL
                ? `حسابك في انتظار التحقق. سنتواصل معك قريباً لتفعيل ${getActionText()} والتقييمات.`
                : `Your account is pending verification. We will contact you soon to activate ${getActionText()} and reviews.`
              }
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setShowDialog(false)}
            >
              {isRTL ? "حسناً" : "OK"}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isRTL ? "تسجيل الخروج" : "Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to check if current user is verified
 */
export function useVerificationStatus() {
  const { user, profile, loading, profileLoading } = useAuth();

  return {
    isLoggedIn: !!user,
    isVerified: profile?.is_verified === true,
    isLoading: loading || profileLoading,
    profile,
  };
}
