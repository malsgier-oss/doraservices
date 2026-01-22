import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useBusinessStore } from "@/hooks/useBusinessStore";
import { useStoreListings } from "@/hooks/useStoreListings";
import { Layout } from "@/components/layout/Layout";
import { FullScreenFallback } from "@/components/layout/FullScreenFallback";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreHeaderSkeleton } from "@/components/store/StoreHeaderSkeleton";
import { ListingCard } from "@/components/store/ListingCard";
import { ListingDetailSheet } from "@/components/store/ListingDetailSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackStoreView } from "@/lib/storeAnalytics";
import type { StoreListing } from "@/types/store";

export default function StorePage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { data: store, isLoading } = useBusinessStore(businessId || null);
  const { data: listings, isLoading: listingsLoading } = useStoreListings(businessId || null);
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);
  const [selectedListing, setSelectedListing] = useState<StoreListing | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="w-full">
          <StoreHeaderSkeleton />
          <div className="container py-6">
            <Skeleton className="h-8 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-full" style={{ aspectRatio: "1" }} />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!store) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">{t("المتجر غير موجود", "Store not found")}</h1>
          <p className="text-muted-foreground">
            {t("هذا المتجر غير موجود أو تم حذفه.", "This store does not exist or has been removed.")}
          </p>
        </div>
      </Layout>
    );
  }

  // Check if store is approved and active
  if (store.authorization_status !== 'approved') {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">{t("المتجر قيد المراجعة", "Store Under Review")}</h1>
          <p className="text-muted-foreground">
            {t("هذا المتجر قيد المراجعة حالياً.", "This store is currently under review.")}
          </p>
        </div>
      </Layout>
    );
  }

  if (store.operational_status !== 'active') {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">{t("المتجر غير متاح", "Store Unavailable")}</h1>
          <p className="text-muted-foreground">
            {t("هذا المتجر غير متاح حالياً.", "This store is currently unavailable.")}
          </p>
        </div>
      </Layout>
    );
  }

  const activeListings = (listings || []).filter((l) => l.status === "active");

  // Track store view on mount
  useEffect(() => {
    if (store && store.authorization_status === 'approved' && store.operational_status === 'active') {
      trackStoreView(store.id);
    }
  }, [store]);

  return (
    <Layout>
      <div className="w-full">
        <StoreHeader store={store} />
        
        {/* Listings Section */}
        <div className="container py-6">
          {listingsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="w-full" style={{ aspectRatio: "1" }} />
                ))}
              </div>
            </div>
          ) : activeListings.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
              <div>
                <h3 className="text-lg font-semibold mb-2">{t("لا توجد إعلانات", "No Listings")}</h3>
                <p className="text-muted-foreground">{t("لا توجد إعلانات متاحة حالياً.", "No listings available at the moment.")}</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold mb-4">{t("الإعلانات", "Listings")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    onClick={() => {
                      setSelectedListing(listing);
                      setDetailSheetOpen(true);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ListingDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        listing={selectedListing}
        store={store}
      />
    </Layout>
  );
}
