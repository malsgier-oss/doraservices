import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCategory } from "@/lib/utils";
import {
  ServiceDetailContent,
  type SheetService,
} from "@/components/service/ServiceDetailSheet";
import { useCities } from "@/hooks/useCities";
import { cn } from "@/lib/utils";

const CITY_STORAGE_KEY = "dora_city_id";

function getStoredCityId(): string | null {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const [row, setRow] = useState<{
    id: string;
    title: string | null;
    category: string | null;
    city: string | null;
  } | null>(null);
  const [loadError, setLoadError] = useState<boolean>(false);

  const cityId = getStoredCityId();
  const { data: cities } = useCities();
  const storedCityName =
    (cities || []).find((c) => c.id === cityId)?.name ?? null;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoadError(false);
    setRow(null);
    supabase
      .from("services")
      .select("id,title,category,city")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) {
          setLoadError(true);
          setRow(null);
          return;
        }
        setRow(data as any);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">خدمة غير موجودة</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          رجوع
        </Button>
      </div>
    );
  }

  if (loadError || (row === null && id)) {
    const stillLoading = row === null && !loadError;
    if (stillLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">
          تعذر تحميل الخدمة أو أنها غير موجودة
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          رجوع
        </Button>
      </div>
    );
  }

  const sheetService: SheetService = {
    titleKey: row?.title || row?.category || "",
    category: normalizeCategory(row?.category || ""),
    categoryName: row?.category || undefined,
    categoryNameAr: undefined,
  };
  const city = (row?.city || storedCityName || null) as string | null;

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-background",
        isRTL && "text-right"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="sticky top-0 z-50 flex items-center gap-2 px-4 py-3 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate(-1)}
        >
          {isRTL ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
        <span className="font-semibold truncate flex-1">
          {row?.title || row?.category || "تفاصيل الخدمة"}
        </span>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <ServiceDetailContent
          service={sheetService}
          city={city}
          initialProviderServiceId={id}
        />
      </div>
    </div>
  );
}
