import { useParams } from "react-router-dom";
import ListingDetailPageContent from "./ListingDetailPageContent";

/**
 * Listing detail page for /listings/:id route.
 * Uses the shared ListingDetailPageContent component with the updated layout.
 */
export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();

  return <ListingDetailPageContent listingId={id} />;
}
