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
import { useAllSubcategories } from "@/hooks/useSubcategories";
import { CategoryBrowseSheet } from "@/components/hub/CategoryBrowseSheet";
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

type SubcategoryRow = {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  icon: string;
  color: string | null;
  display_order: number | null;
  is_active: boolean | null;
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

async function fetchShelfSubcategories(params: { categoryId: string; limit: number }) {
  const { categoryId, limit } = params;
  const { data, error } = await supabase
    .from("subcategories")
    .select("id,category_id,name,name_ar,icon,color,display_order,is_active")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("fetchShelfSubcategories error:", error);
    return [];
  }
  return (data as any[]) as SubcategoryRow[];
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
  const { data: allSubcategories } = useAllSubcategories();

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

  // Bottom sheets
  // 1) Category browse (shows subcategories)
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);

  const browseCategory = useMemo(() => {
    if (!browseCategoryId) return null;
    return categoriesById[browseCategoryId] || null;
  }, [browseCategoryId, categoriesById]);

  function openCategoryBrowse(categoryId: string) {
    setBrowseCategoryId(categoryId);
    setBrowseOpen(true);
  }

  // 2) Provider list sheet (for a selected subcategory)
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [initialProviderServiceId, setInitialProviderServiceId] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<{
    id: string;
    name: string;
    name_ar?: string | null;
    icon: LucideIcon;
    color: string | null;
  } | null>(null);

  const selectedSheetService = useMemo(() => {
    if (!selectedSubcategory) return null;
    return {
      id: selectedSubcategory.id,
      titleKey: selectedSubcategory.name_ar || selectedSubcategory.name,
      descKey: "",
      // IMPORTANT: ServiceDetailSheet filters services.category by this value.
      // We use the subcategory English name as the canonical stored value.
      category: selectedSubcategory.name,
      categoryName: selectedSubcategory.name,
      categoryNameAr: selectedSubcategory.name_ar || undefined,
      color: selectedSubcategory.color || "#888888",
      icon: selectedSubcategory.icon,
    };
  }, [selectedSubcategory]);

  function openSubcategoryProviders(subcat: { id: string; name: string; name_ar?: string | null; icon: LucideIcon; color: string | null }, providerServiceId?: string | null) {
    setSelectedSubcategory(subcat);
    setInitialProviderServiceId(providerServiceId || null);
    setServiceSheetOpen(true);
  }

  // Shelves data (category shelves load subcategories)
  const [subcatsByShelfId, setSubcatsByShelfId] = useState<Record<string, SubcategoryRow[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const next: Record<string, SubcategoryRow[]> = {};
      for (const shelf of shelves) {
        if (shelf.shelf_type !== "category") continue;
        if (!shelf.category_id) continue;

        const cat = categoriesById[shelf.category_id];
        if (!cat) continue;

        const rows = await fetchShelfSubcategories({
          categoryId: shelf.category_id,
          limit: Math.max(1, shelf.max_items || 10),
        });

        if (cancelled) return;
        next[shelf.id] = rows;
      }

      if (!cancelled) setSubcatsByShelfId(next);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [shelves, categoriesById]);

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
                        openCategoryBrowse(c.id);
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
                          openCategoryBrowse(b.target_category_id);
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
                    onClick={() => openCategoryBrowse(c.id)}
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
              const subcats = subcatsByShelfId[shelf.id] || [];
              if (subcats.length === 0) return null;

              return (
                <div key={shelf.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{shelf.title_ar}</div>
                    <Button variant="ghost" size="sm" onClick={() => openCategoryBrowse(cat.id)}>
                      عرض الكل
                    </Button>
                  </div>

                  <ScrollArea className="w-full">
                    <div className="flex gap-3 pb-2">
                      {subcats.map((sc) => {
                        const Icon = ICON_MAP[sc.icon] || Wrench;
                        return (
                        <button
                          key={sc.id}
                          className="min-w-[44%] md:min-w-[28%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          onClick={() => openSubcategoryProviders({ id: sc.id, name: sc.name, name_ar: sc.name_ar, icon: Icon, color: sc.color })}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: (sc.color || "#888") + "22" }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{sc.name_ar || sc.name}</div>
                        </button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              );
            }

            // Manual shelf: show curated category tiles
            const items = itemsByShelf[shelf.id] || [];
            const subcats = (items
              .map((it) => {
                const sid = (it as any).subcategory_id as string | null | undefined;
                if (!sid) return null;
                return (allSubcategories || []).find((s) => s.id === sid) || null;
              })
              .filter(Boolean) as any[]) as SubcategoryRow[];
            if (subcats.length === 0) return null;

            return (
              <div key={shelf.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">{shelf.title_ar}</div>
                </div>

                <ScrollArea className="w-full">
                  <div className="flex gap-3 pb-2">
                    {subcats.map((s) => {
                      const Icon = ICON_MAP[s.icon] || Wrench;
                      return (
                        <button
                          key={s.id}
                          className="min-w-[34%] md:min-w-[22%] rounded-xl border bg-card p-3 hover:bg-accent transition flex flex-col items-center gap-2"
                          onClick={() => openSubcategoryProviders({ id: s.id, name: s.name, name_ar: s.name_ar, icon: Icon, color: s.color })}
                        >
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: (s.color || "#888") + "22" }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="text-xs text-center leading-tight line-clamp-2">{s.name_ar || s.name}</div>
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

      <CategoryBrowseSheet
        open={browseOpen}
        onOpenChange={setBrowseOpen}
        category={browseCategory}
        iconMap={ICON_MAP}
        onSelectSubcategory={(subcat) => {
          setBrowseOpen(false);
          openSubcategoryProviders(subcat);
        }}
      />

      <ServiceDetailSheet
        open={serviceSheetOpen}
        onOpenChange={(open) => {
          setServiceSheetOpen(open);
          if (!open) setInitialProviderServiceId(null);
        }}
        service={selectedSheetService}
        initialProviderServiceId={initialProviderServiceId}
      />

      <MobileNav />
    </div>
  );
}
