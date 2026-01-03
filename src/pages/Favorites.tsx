import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Loader2, Phone, Trash2, Filter } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

      // Get service details - include provider_name and provider_phone for bulk-uploaded services
      const serviceIds = savedData.map(s => s.business_id);
      const { data: services } = await supabase
        .from("services")
        .select("id, title, category, user_id, provider_name, provider_phone")
        .in("id", serviceIds);

      if (!services || services.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Get provider profiles only for claimed services (those with user_id)
      const userIds = [...new Set(services.map(s => s.user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; phone: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, phone")
          .in("user_id", userIds);

        profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      }

      const serviceMap = new Map(services.map(s => [s.id, s]));

      const enrichedFavorites: FavoriteService[] = savedData
        .filter(saved => serviceMap.has(saved.business_id))
        .map(saved => {
          const service = serviceMap.get(saved.business_id)!;
          const profile = service.user_id ? profileMap.get(service.user_id) : null;
          
          // For bulk-uploaded services (user_id is null), use the service table's provider info
          // For claimed services, use the profile data
          return {
            id: saved.id,
            service_id: service.id,
            service_title: service.title,
            service_category: service.category,
            provider_name: profile?.full_name || service.provider_name || (isRTL ? "مقدم الخدمة" : "Provider"),
            provider_avatar: profile?.avatar_url || "",
            provider_phone: profile?.phone || service.provider_phone || "",
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
    if (!user) {
      navigate("/auth");
      return;
    }
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Get unique categories from favorites
  const categories = useMemo(() => {
    const unique = [...new Set(favorites.map(f => f.service_category))];
    return unique;
  }, [favorites]);

  // Filter favorites by category
  const filteredFavorites = useMemo(() => {
    if (categoryFilter === "all") return favorites;
    return favorites.filter(f => f.service_category === categoryFilter);
  }, [favorites, categoryFilter]);

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
        {/* Header with Filter */}
        <div className={cn(
          "flex items-center justify-between gap-4",
          isRTL && "flex-row-reverse"
        )}>
          <h1 className={cn(
            "text-2xl font-bold text-foreground",
            isRTL ? "text-right" : "text-left"
          )}>
            {t.favorites?.title || (isRTL ? "المفضلة" : "Favorites")}
          </h1>

          {/* Category Filter */}
          {favorites.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={isRTL ? "كل الفئات" : "All categories"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isRTL ? "كل الفئات" : "All categories"}
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t.categories[cat as keyof typeof t.categories] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Results count when filtered */}
        {categoryFilter !== "all" && (
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? `${filteredFavorites.length} نتيجة`
              : `${filteredFavorites.length} result${filteredFavorites.length !== 1 ? 's' : ''}`
            }
          </p>
        )}

        {/* Favorites List */}
        <div className="space-y-3">
          {filteredFavorites.length > 0 ? (
            filteredFavorites.map((fav) => (
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
          ) : favorites.length > 0 && categoryFilter !== "all" ? (
            // No results for current filter
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {isRTL ? "لا توجد نتائج لهذه الفئة" : "No results for this category"}
              </p>
              <Button 
                variant="outline"
                onClick={() => setCategoryFilter("all")}
                className="mt-4 rounded-full"
              >
                {isRTL ? "عرض الكل" : "Show all"}
              </Button>
            </div>
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