import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PlusCircle, ShoppingBag } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HUB_CARD_BASE } from "@/components/hub/hubStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useListings, type Listing, type ListingStatus } from "@/hooks/useListings";
import { ListingCard } from "@/components/hub/ListingCard";
import { ListingDetailSheet } from "@/components/hub/ListingDetailSheet";
import { useBuySellEnabled } from "@/hooks/useBuySellEnabled";

export default function MyListings() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const { user } = useAuth();
  const { isEnabled: buySellEnabled, isLoading: buySellLoading } = useBuySellEnabled();

  const [tab, setTab] = useState<ListingStatus>("active");
  const { data: listings, isLoading } = useListings({
    userId: user?.id || null,
    status: tab,
    limit: 200,
    enabled: !!user,
  });

  const [selected, setSelected] = useState<Listing | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const emptyText = useMemo(() => {
    if (tab === "active") return t("لا توجد إعلانات نشطة", "No active listings");
    if (tab === "sold") return t("لا توجد إعلانات مباعة", "No sold listings");
    return t("لا توجد إعلانات مؤرشفة", "No archived listings");
  }, [tab, language]);

  return (
    <Layout>
      <div className="container py-4 space-y-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-base font-semibold text-foreground">{t("إعلاناتي", "My Listings")}</h1>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/buy-sell/create-listing")}
            disabled={!buySellEnabled}
          >
            {t("إعلان جديد", "New listing")}
          </Button>
        </div>

        {buySellLoading ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("جاري التحميل...", "Loading...")}
          </div>
        ) : !buySellEnabled ? (
          <div className={`${HUB_CARD_BASE} bg-card p-6 text-sm text-muted-foreground text-center`}>
            {t("ميزة الشراء والبيع غير مفعلة حالياً.", "Buy & Sell is currently disabled.")}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as ListingStatus)}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="active">
                {t("نشطة", "Active")}
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="sold">
                {t("مباع", "Sold")}
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="archived">
                {t("مؤرشف", "Archived")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={`my-listings-loading-${i}`} className={`${HUB_CARD_BASE} bg-card overflow-hidden`}>
                      <Skeleton className="aspect-[4/3] w-full" />
                      <div className="p-4">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !listings || listings.length === 0 ? (
                <div className={`${HUB_CARD_BASE} bg-card p-8 flex flex-col items-center justify-center gap-4 text-center`}>
                  <ShoppingBag className="h-12 w-12 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">{emptyText}</p>
                  {tab === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => navigate("/buy-sell/create-listing")} className="gap-1.5">
                      <PlusCircle className="h-4 w-4" />
                      {t("نشر إعلانك الأول", "Post your first listing")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listings.map((l) => (
                    <ListingCard
                      key={l.id}
                      listing={l}
                      isRTL={isRTL}
                      onClick={() => {
                        setSelected(l);
                        setSheetOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {buySellEnabled ? (
        <ListingDetailSheet
          open={sheetOpen}
          listing={selected}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) setSelected(null);
          }}
          onSelectListing={(l) => {
            setSelected(l);
            setSheetOpen(true);
          }}
        />
      ) : null}
    </Layout>
  );
}

