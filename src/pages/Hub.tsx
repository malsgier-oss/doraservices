import { useEffect, useMemo, useState } from "react";
import { Bell, ChevronDown, Search, Wrench, Home, Car, Zap, Briefcase, Building2, GraduationCap, Heart, PartyPopper, Droplets, Wind, Fuel, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { MobileNav } from "@/components/layout/MobileNav";
import { ServiceDetailSheet } from "@/components/service/ServiceDetailSheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

import { useCategories } from "@/hooks/useCategories";
import { useCities } from "@/hooks/useCities";
import { useHubBanners } from "@/hooks/useHubBanners";
import { useHubShelves } from "@/hooks/useHubShelves";
import { supabase } from "@/integrations/supabase/client";

type ServiceRow = {
  id: string;
  title: string;
  category: string;
  provider_name: string | null;
  provider_phone: string | null;
  city: string | null;
  sub_city: string | null;
  image_url: string | null;
};

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Car,
  Zap,
  Briefcase,
  Building2,
  GraduationCap,
  Heart,
  PartyPopper,
  Wrench,
  Droplets,
  Wind,
  Fuel,
  ClipboardCheck,
};

const CITY_STORAGE_KEY = "dora_city_id";

function useSelectedCityId() {
  const [cityId, setCityId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CITY_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (cityId) localStorage.setItem(CITY_STORAGE_KEY, cityId);
      else localStorage.removeItem(CITY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, [cityId]);

  return { cityId, setCityId };
}

async function fetchShelfServices(params: { categoryName: string; cityName?: string | null; limit: number }) {
  const { categoryName, cityName, limit } = params;

  let q = supabase
    .from("services")
    .select("id,title,category,provider_name,provider_phone,city,sub_city,image_url")
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("is_paused", false)
    .eq("approval_status", "approved")
    .eq("category", categoryName)
    .order("is_featured", { ascending: false })
    .order("featured_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cityName) q = q.eq("city", cityName);

  const { data, error } = await q;
  if (error) {
    console.error("fetchShelfServices error:", error);
    return [];
  }
  return (data as any[]) as ServiceRow[];
}

export default function Hub() {
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const { data: citiesData } = useCities();

  const { cityId, setCityId } = useSelectedCityId();

  const selectedCity = useMemo(() => {
    return (citiesData || []).find((c) => c.id === cityId) || null;
  }, [citiesData, cityId]);

  const selectedCityName = selectedCity?.name || null;

  const { banners, publicUrlsById } = useHubBanners(cityId);
  const { shelves, itemsByShelf } = useHubShelves(cityId);

  const categories = useMemo(() => {
    return (categoriesData || []).filter((c) => c.is_active !== false).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  }, [categoriesData]);

  const categoriesById = useMemo(() => {
    const map: Record<string, (typeof categories)[number]> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  // Search
  const [query, setQuery] = useState("");
  const queryTrim = query.trim();

  const filteredCategories = useMemo(() => {
    if (!queryTrim) return [];
    const ql = queryTrim.toLowerCase();
    return categories.filter((c) => (c.name_ar || c.name).toLowerCase().includes(ql)).slice(0, 10);
  }, [categories, queryTrim]);

  // Bottom sheet (category -> provider list)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return categoriesById[selectedCategoryId] || null;
  }, [selectedCategoryId, categoriesById]);

  const selectedSheetService = useMemo(() => {
    if (!selectedCategory) return null;
    const icon = ICON_MAP[selectedCategory.icon] || Wrench;
    return {
      id: selectedCategory.id,
      titleKey: selectedCategory.name_ar || selectedCategory.name,
      descKey: "",
      category: selectedCategory.name, // must match services.category
      categoryName: selectedCategory.name,
      categoryNameAr: selectedCategory.name_ar || undefined,
      color: selectedCategory.color,
      icon,
    };
  }, [selectedCategory]);

  function openCategorySheet(categoryId: string, providerServiceId?: string | null) {
    setSelectedCategoryId(categoryId);
    setInitialProviderServiceId(providerServiceId || null);
    setSheetOpen(true);
  }

  // Shelves data (category shelves load services)
  const [servicesByShelfId, setServicesByShelfId] = useState<Record<string, ServiceRow[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next: Record<string, ServiceRow[]> = {};
      for (const shelf of shelves) {
        if (shelf.shelf_type !== "category") continue;
        if (!shelf.category_id) continue;

        const cat = categoriesById[shelf.category_id];
        if (!cat) continue;

        const rows = await fetchShelfServices({
          categoryName: cat.name,
          cityName: selectedCityName,
          limit: Math.max(1, shelf.max_items || 10),
        });

        if (cancelled) return;
        next[shelf.id] = rows;
      }

      if (!cancelled) setServicesByShelfId(next);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [shelves, categoriesById, selectedCityName]);

  // Services grid (top 8 categories)
  const gridCategories = useMemo(() => categories.slice(0, 8), [categories]);

  const cityLabel = selectedCity ? (selectedCity.name_ar || selectedCity.name) : "كل المدن";

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-semibold leading-tight">شن تحتاج اليوم؟</div>
            <div className="text-sm text-muted-foreground">ابحث وتواصل مباشرة</div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search + City */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder="ابحث عن خدمة… كهرباء، سباكة، تكييف"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" className="w-full justify-between">
                <span className="truncate">{cityLabel}</span>
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-2">
              <div className="space-y-1 max-h-64 overflow-auto">
                <Button
                  variant={!cityId ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCityId(null)}
                >
                  كل المدن
                </Button>
                {(citiesData || [])
                  .filter((c) => c.is_active)
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((c) => (
                    <Button
                      key={c.id}
                      variant={cityId === c.id ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setCityId(c.id)}
                    >
                      {c.name_ar || c.name}
                    </Button>
                  ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Search results (category matches) */}
          {queryTrim && (
            <Card>
              <CardContent className="p-2 space-y-1">
                {filteredCategories.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">لا توجد نتائج</div>
                ) : (
                  filteredCategories.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setQuery("");
                        openCategorySheet(c.id);
                      }}
                    >
                      {c.name_ar || c.name}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Banner carousel (admin-controlled) */}
        {banners.length > 0 && (
          <div className="space-y-2">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {banners.map((b) => {
                  const url = publicUrlsById[b.id];
                  return (
                    <button
                      key={b.id}
                      className="min-w-[85%] md:min-w-[70%] rounded-xl overflow-hidden border bg-card text-left"
                      onClick={() => {
                        if (b.target_type === "category" && b.target_category_id) {
                          openCategorySheet(b.target_category_id);
                        } else if (b.target_type === "url" && b.target_url) {
                          window.open(b.target_url, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <div className="h-36 w-full bg-muted">
                        {url ? (
                          <img src={url} alt={b.title_ar} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <div className="font-semibold">{b.title_ar}</div>
                        {b.subtitle_ar ? <div className="text-sm text-muted-foreground">{b.subtitle_ar}</div> : null}
                        {b.cta_text_ar ? <div className="mt-2 text-sm font-medium text-primary">{b.cta_text_ar}</div> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        {/* Services (categories) grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">الخدمات</div>
            {/* P0: keep "عرض الكل" simple by scrolling to the full list later. */}
          </div>

          {categoriesLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {gridCategories.map((c) => {
                const Icon = ICON_MAP[c.icon] || Wrench;
                return (
                  <button
                    key={c.id}
                    className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent transition"
                    onClick={() => openCategorySheet(c.id)}
                  >
                    <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: c.color + "22" }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-xs text-center leading-tight line-clamp-2">{c.name_ar || c.name}</div>
                  </button>
                );
              })}

              {/* More */}
              <button
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 hover:bg-accent transition"
                onClick={() => setQuery(" ")}
                title="المزيد"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center bg-muted">
                  <ChevronDown className="h-5 w-5" />
                </div>
                <div className="text-xs text-center">المزيد</div>
              </button>
            </div>
          )}
        </div>

        {/* Shelves (admin-controlled) */}
        <div className="space-y-6">
          {shelves.map((shelf) => {
            const cityOk = true;
            if (!cityOk) return null;

            if (shelf.shelf_type === "category") {
              if (!shelf.category_id) return null;
              const cat = categoriesById[shelf.category_id];
              if (!cat) return null;
              const services = servicesByShelfId[shelf.id] || [];
              if (services.length === 0) return null;

              return (
                <div key={shelf.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{shelf.title_ar}</div>
                    <Button variant="ghost" size="sm" onClick={() => openCategorySheet(cat.id)}>
                      عرض الكل
                    </Button>
                  </div>

                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-2">
                      {services.map((svc) => (
                        <button
                          key={svc.id}
                          className="min-w-[70%] md:min-w-[45%] rounded-xl border bg-card p-3 text-left hover:bg-accent transition"
                          onClick={() => openCategorySheet(cat.id, svc.id)}
                        >
                          <div className="font-semibold line-clamp-1">{svc.provider_name || svc.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-1">{cat.name_ar || cat.name}</div>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {(svc.sub_city || "") + (svc.sub_city && svc.city ? " • " : "") + (svc.city || "")}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (svc.provider_phone) window.location.href = `tel:${svc.provider_phone}`;
                              }}
                            >
                              اتصال
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (svc.provider_phone) {
                                  const phone = svc.provider_phone.replace(/^\+/, "");
                                  window.open(`https://wa.me/${phone}`, "_blank", "noopener,noreferrer");
                                }
                              }}
                            >
                              واتساب
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              );
            }

            // Manual shelf: show curated category tiles
            const items = itemsByShelf[shelf.id] || [];
            const cats = items.map((it) => categoriesById[it.category_id]).filter(Boolean);
            if (cats.length === 0) return null;

            return (
              <div key={shelf.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">{shelf.title_ar}</div>
                </div>

                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {cats.map((c) => {
                      const Icon = ICON_MAP[c.icon] || Wrench;
                      return (
                        <button
                          key={c.id}
                          className="min-w-[34%] md:min-w-[22%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          onClick={() => openCategorySheet(c.id)}
                        >
                          <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: c.color + "22" }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{c.name_ar || c.name}</div>
                        </button>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      <ServiceDetailSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setInitialProviderServiceId(null);
        }}
        service={selectedSheetService}
        initialProviderServiceId={initialProviderServiceId}
      />

      <MobileNav />
    </div>
  );
}
