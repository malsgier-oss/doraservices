import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, User, Phone, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteService {
  id: string;
  service_id: string;
  service_title: string;
  service_category: string;
  provider_name: string;
  provider_avatar: string;
  provider_phone: string;
}

export default function Favorites() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get saved services
      const { data: savedData, error: savedError } = await supabase
        .from("saved_businesses")
        .select("id, business_id")
        .eq("user_id", user.id);

      if (savedError) {
        console.error("Error fetching favorites:", savedError);
        setLoading(false);
        return;
      }

      if (!savedData || savedData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Get service details
      const serviceIds = savedData.map(s => s.business_id);
      const { data: services } = await supabase
        .from("services")
        .select("id, title, category, user_id")
        .in("id", serviceIds);

      if (!services || services.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Get provider profiles
      const userIds = [...new Set(services.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const serviceMap = new Map(services.map(s => [s.id, s]));

      const enrichedFavorites: FavoriteService[] = savedData
        .filter(saved => serviceMap.has(saved.business_id))
        .map(saved => {
          const service = serviceMap.get(saved.business_id)!;
          const profile = profileMap.get(service.user_id);
          return {
            id: saved.id,
            service_id: service.id,
            service_title: service.title,
            service_category: service.category,
            provider_name: profile?.full_name || (isRTL ? "مقدم الخدمة" : "Provider"),
            provider_avatar: profile?.avatar_url || "",
            provider_phone: profile?.phone || "",
          };
        });

      setFavorites(enrichedFavorites);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    const { error } = await supabase
      .from("saved_businesses")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(isRTL ? "حدث خطأ" : "Error removing favorite");
    } else {
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success(isRTL ? "تمت الإزالة من المفضلة" : "Removed from favorites");
    }
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <h1 className={cn(
          "text-2xl font-bold text-foreground",
          isRTL ? "text-right" : "text-left"
        )}>
          {t.favorites?.title || (isRTL ? "المفضلة" : "Favorites")}
        </h1>

        {/* Favorites List */}
        <div className="space-y-3">
          {favorites.length > 0 ? (
            favorites.map((fav) => (
              <div
                key={fav.id}
                className={cn(
                  "bg-card rounded-2xl border border-border p-4 flex items-center gap-4",
                  isRTL && "flex-row-reverse"
                )}
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage src={fav.provider_avatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {fav.provider_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                  <h3 className="font-semibold text-foreground truncate">
                    {fav.provider_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {fav.service_title}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {t.categories[fav.service_category as keyof typeof t.categories] || fav.service_category}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {fav.provider_phone && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => handleCall(fav.provider_phone)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveFavorite(fav.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">
                {t.favorites?.noFavorites || (isRTL ? "لا توجد مفضلات" : "No favorites yet")}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.favorites?.noFavoritesDesc || (isRTL ? "أضف خدمات إلى المفضلة من الصفحة الرئيسية" : "Add services to favorites from the home page")}
              </p>
              <Button 
                onClick={() => navigate("/")}
                className="rounded-full"
              >
                {t.services?.backToHub || (isRTL ? "العودة للرئيسية" : "Browse Services")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
