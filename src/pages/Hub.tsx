import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Hub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL, t } = useLanguage();

  return (
    <div className="min-h-screen p-6" dir={isRTL ? "rtl" : "ltr"}>
      <h1 className="text-xl font-bold">{t.appName} — Hub</h1>
      <p className="mt-2 text-sm text-gray-600">
        Hub is rendering. User: {user ? "logged in" : "guest"}
      </p>

      <button
        onClick={() => (user ? navigate("/profile") : navigate("/auth"))}
        className="mt-6 h-10 px-4 rounded-xl bg-black text-white inline-flex items-center gap-2"
      >
        <User className="h-4 w-4" />
        {user ? (isRTL ? "الملف الشخصي" : "Profile") : (isRTL ? "تسجيل الدخول" : "Sign in")}
      </button>
    </div>
  );
}