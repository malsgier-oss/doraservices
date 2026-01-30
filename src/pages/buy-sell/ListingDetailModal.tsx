import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useListing } from "@/hooks/useListing";
import { ListingDetailSheet } from "@/components/hub/ListingDetailSheet";
import ListingDetailPageContent from "./ListingDetailPageContent";

/**
 * Route-backed listing detail modal.
 * 
 * When accessed with backgroundLocation state (from CategoryDetail), renders as drawer overlay.
 * When accessed directly (deep link), renders as full page.
 */
export default function ListingDetailModal() {
  const { categoryId: categorySlug, listingId } = useParams<{ categoryId: string; listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safe typed access to backgroundLocation state
  const state = location.state as { backgroundLocation?: typeof location } | null;
  const backgroundLocation = state?.backgroundLocation;
  
  // Only treat as overlay if:
  // 1. backgroundLocation exists AND
  // 2. backgroundLocation pathname is DIFFERENT from current pathname (not stale state)
  // 3. backgroundLocation is NOT pointing to a listing route (it should be the category page behind)
  const isValidOverlay = backgroundLocation && 
    backgroundLocation.pathname !== location.pathname &&
    !backgroundLocation.pathname.includes('/listing/');

  const { data: listing, isLoading } = useListing(listingId);

  const handleClose = () => {
    if (isValidOverlay) {
      // Go back to category page (preserves history)
      navigate(-1);
    } else {
      // Deep link case - navigate to category page
      navigate(`/buy-sell/category/${categorySlug}`, { replace: true });
    }
  };

  // Direct URL access OR stale state - render full page
  if (!isValidOverlay) {
    return (
      <ListingDetailPageContent
        listingId={listingId}
        categorySlug={categorySlug}
      />
    );
  }

  // Overlay from category page - render drawer
  return (
    <ListingDetailSheet
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      listing={listing ?? null}
      listingId={listingId}
      categorySlug={categorySlug}
    />
  );
}
