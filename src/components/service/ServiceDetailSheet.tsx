import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Phone, Star, Clock, ChevronRight, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

interface ServiceProvider {
  id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  user_id: string;
  provider_name: string;
  provider_avatar: string;
  provider_phone: string;
}

interface ServiceDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    titleKey: string;
    descKey: string;
    category: string;
    color: string;
    icon: LucideIcon;
  } | null;
}

export function ServiceDetailSheet({ open, onOpenChange, service }: ServiceDetailSheetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    if (open && service) {
      fetchProviders();
    }
  }, [open, service]);

  const fetchProviders = async () => {
    if (!service) return;
    
    setLoading(true);
    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("category", service.category)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setLoading(false);
        return;
      }

      if (!servicesData || servicesData.length === 0) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Get provider profiles
      const userIds = [...new Set(servicesData.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, phone")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedServices: ServiceProvider[] = servicesData.map(svc => ({
        id: svc.id,
        title: svc.title,
        description: svc.description,
        category: svc.category,
        image_url: svc.image_url,
        user_id: svc.user_id,
        provider_name: profileMap.get(svc.user_id)?.full_name || (isRTL ? "مقدم الخدمة" : "Provider"),
        provider_avatar: profileMap.get(svc.user_id)?.avatar_url || "",
        provider_phone: profileMap.get(svc.user_id)?.phone || "",
      }));

      setProviders(enrichedServices);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  const IconComponent = service.icon;
  const title = t.featuredList[service.titleKey as keyof typeof t.featuredList] || service.titleKey;
  const categoryLabel = t.categories[service.category as keyof typeof t.categories] || service.category;

  const handleProviderClick = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  const handleCall = (phone: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleToggleFavorite = async (serviceId: string) => {
    if (!user) {
      onOpenChange(false);
      navigate("/auth");
      return;
    }
    
    const result = await toggleFavorite(serviceId);
    if (!result.error) {
      if (result.added) {
        toast.success(isRTL ? "تمت الإضافة للمفضلة" : "Added to favorites");
      } else {
        toast.success(isRTL ? "تمت الإزالة من المفضلة" : "Removed from favorites");
      }
    }
  };

  const handleBack = () => {
    setSelectedProvider(null);
  };

  // Provider detail view
  if (selectedProvider) {
    const isProviderFavorite = isFavorite(selectedProvider.id);
    
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedProvider(null);
        onOpenChange(isOpen);
      }}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="relative pb-0">
            <button
              onClick={handleBack}
              className={cn(
                "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
                isRTL ? "right-4" : "left-4"
              )}
            >
              <ChevronRight className={cn("h-4 w-4 text-muted-foreground", !isRTL && "rotate-180")} />
            </button>
            <DrawerClose className={cn(
              "absolute top-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center",
              isRTL ? "left-4" : "right-4"
            )}>
              <X className="h-4 w-4 text-muted-foreground" />
            </DrawerClose>
            <div className="flex flex-col items-center pt-2">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={selectedProvider.provider_avatar || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                  {selectedProvider.provider_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <DrawerTitle className="text-xl font-bold text-foreground">
                {selectedProvider.provider_name}
              </DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">{selectedProvider.title}</p>
            </div>
          </DrawerHeader>

          <div className="px-6 py-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
            {/* Rating & Info */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">{isRTL ? "جديد" : "New"}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{isRTL ? "متاح" : "Available"}</span>
              </div>
            </div>

            {/* Description */}
            {selectedProvider.description && (
              <div className="bg-muted/50 rounded-2xl p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  {isRTL ? "عن الخدمة" : "About this service"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedProvider.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-14 rounded-2xl"
                onClick={() => handleCall(selectedProvider.provider_phone)}
                disabled={!selectedProvider.provider_phone}
              >
                <Phone className="h-5 w-5 mr-2" />
                {isRTL ? "اتصل" : "Call"}
              </Button>
              <Button
                variant={isProviderFavorite ? "default" : "outline"}
                size="lg"
                className={cn(
                  "flex-1 h-14 rounded-2xl",
                  isProviderFavorite && "bg-red-500 hover:bg-red-600 text-white"
                )}
                onClick={() => handleToggleFavorite(selectedProvider.id)}
              >
                <Heart className={cn("h-5 w-5 mr-2", isProviderFavorite && "fill-current")} />
                {isProviderFavorite 
                  ? (isRTL ? "في المفضلة" : "Favorited") 
                  : (isRTL ? "أضف للمفضلة" : "Add to Favorites")
                }
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Providers list view
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative pb-0">
          <DrawerClose className="absolute top-0 right-4 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </DrawerClose>
          <div className="flex flex-col items-center pt-2">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mb-3",
              service.color
            )}>
              <IconComponent className="h-8 w-8 text-foreground" strokeWidth={1.5} />
            </div>
            <DrawerTitle className="text-xl font-bold text-foreground">
              {title}
            </DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">{categoryLabel}</p>
          </div>
        </DrawerHeader>

        <div className="px-4 py-4" dir={isRTL ? "rtl" : "ltr"}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
            {isRTL ? "مقدمي الخدمة المتاحين" : "Available Service Providers"}
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-muted rounded-2xl h-20 animate-pulse" />
              ))}
            </div>
          ) : providers.length > 0 ? (
            <div className="space-y-2">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderClick(provider)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border transition-colors hover:bg-muted/50 active:bg-muted",
                    isRTL && "flex-row-reverse text-right"
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={provider.provider_avatar || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                      {provider.provider_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{provider.provider_name}</h4>
                    <p className="text-sm text-muted-foreground truncate">{provider.title}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{isRTL ? "جديد" : "New"}</span>
                  </div>
                  <ChevronRight className={cn(
                    "h-5 w-5 text-muted-foreground/50",
                    isRTL && "rotate-180"
                  )} />
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {isRTL ? "لا يوجد مقدمي خدمة حالياً" : "No providers available yet"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {isRTL ? "كن أول من يقدم هذه الخدمة!" : "Be the first to offer this service!"}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  onOpenChange(false);
                  navigate(user ? "/create-service" : "/auth");
                }}
              >
                {isRTL ? "قدم خدمتك" : "Offer your service"}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
