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
  const hasBackground = !!state?.backgroundLocation;
  
  // #region agent log
  console.log('[DEBUG] ListingDetailModal render:', {hasBackground, stateRaw: location.state, stateType: typeof location.state, backgroundLocationExists: !!state?.backgroundLocation, pathname: location.pathname});
  fetch('http://127.0.0.1:7242/ingest/9400dad2-6936-4b7c-930c-5ff551ab6c67',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListingDetailModal.tsx:20',message:'ListingDetailModal render',data:{hasBackground,stateRaw:location.state,stateType:typeof location.state,backgroundLocationExists:!!state?.backgroundLocation,pathname:location.pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  const { data: listing, isLoading } = useListing(listingId);

  const handleClose = () => {
    if (hasBackground) {
      // Go back to category page (preserves history)
      navigate(-1);
    } else {
      // Deep link case - navigate to category page
      navigate(`/buy-sell/category/${categorySlug}`, { replace: true });
    }
  };

  // Direct URL access - render full page
  if (!hasBackground) {
    // #region agent log
    console.log('[DEBUG] Rendering FULL PAGE (ListingDetailPageContent):', {listingId, categorySlug});
    fetch('http://127.0.0.1:7242/ingest/9400dad2-6936-4b7c-930c-5ff551ab6c67',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListingDetailModal.tsx:38',message:'Rendering FULL PAGE (ListingDetailPageContent)',data:{listingId,categorySlug},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return (
      <ListingDetailPageContent
        listingId={listingId}
        categorySlug={categorySlug}
      />
    );
  }

  // #region agent log
  console.log('[DEBUG] Rendering DRAWER (ListingDetailSheet):', {listingId, categorySlug, hasBackground});
  fetch('http://127.0.0.1:7242/ingest/9400dad2-6936-4b7c-930c-5ff551ab6c67',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ListingDetailModal.tsx:49',message:'Rendering DRAWER (ListingDetailSheet)',data:{listingId,categorySlug,hasBackground},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

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
