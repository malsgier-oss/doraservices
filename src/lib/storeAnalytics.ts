import { supabase } from "@/integrations/supabase/client";

// Track store view (once per session)
const STORE_VIEW_KEY = (businessId: string) => `store_view_${businessId}`;
const LISTING_VIEW_KEY = (listingId: string) => `listing_view_${listingId}`;

export async function trackStoreView(businessId: string): Promise<void> {
  // Check if already tracked in this session
  const key = STORE_VIEW_KEY(businessId);
  if (sessionStorage.getItem(key)) return;

  try {
    const { error } = await supabase.rpc('increment_store_views', {
      business_id: businessId,
    });

    if (error) {
      // Fallback: direct update if RPC doesn't exist
      const { data: business } = await supabase
        .from("businesses")
        .select("total_views")
        .eq("id", businessId)
        .single();

      if (business) {
        await supabase
          .from("businesses")
          .update({ total_views: (business.total_views || 0) + 1 })
          .eq("id", businessId);
      }
    } else {
      sessionStorage.setItem(key, "1");
    }
  } catch (error) {
    console.error("Error tracking store view:", error);
  }
}

export async function trackListingView(listingId: string): Promise<void> {
  // Check if already tracked in this session
  const key = LISTING_VIEW_KEY(listingId);
  if (sessionStorage.getItem(key)) return;

  try {
    const { data: listing } = await supabase
      .from("store_listings")
      .select("views_count")
      .eq("id", listingId)
      .single();

    if (listing) {
      await supabase
        .from("store_listings")
        .update({ views_count: (listing.views_count || 0) + 1 })
        .eq("id", listingId);
    }

    if (!error) {
      sessionStorage.setItem(key, "1");
    }
  } catch (error) {
    console.error("Error tracking listing view:", error);
  }
}

export async function trackStoreCall(businessId: string): Promise<void> {
  try {
    const { data: business } = await supabase
      .from("businesses")
      .select("total_calls")
      .eq("id", businessId)
      .single();

    if (business) {
      await supabase
        .from("businesses")
        .update({ total_calls: (business.total_calls || 0) + 1 })
        .eq("id", businessId);
    }
  } catch (error) {
    console.error("Error tracking store call:", error);
  }
}

export async function trackListingCall(listingId: string): Promise<void> {
  try {
    const { data: listing } = await supabase
      .from("store_listings")
      .select("calls_count")
      .eq("id", listingId)
      .single();

    if (listing) {
      await supabase
        .from("store_listings")
        .update({ calls_count: (listing.calls_count || 0) + 1 })
        .eq("id", listingId);
    }
  } catch (error) {
    console.error("Error tracking listing call:", error);
  }
}

export async function trackStoreWhatsApp(businessId: string): Promise<void> {
  try {
    const { data: business } = await supabase
      .from("businesses")
      .select("total_whatsapp")
      .eq("id", businessId)
      .single();

    if (business) {
      await supabase
        .from("businesses")
        .update({ total_whatsapp: (business.total_whatsapp || 0) + 1 })
        .eq("id", businessId);
    }
  } catch (error) {
    console.error("Error tracking store WhatsApp:", error);
  }
}

export async function trackListingWhatsApp(listingId: string): Promise<void> {
  try {
    const { data: listing } = await supabase
      .from("store_listings")
      .select("whatsapp_count")
      .eq("id", listingId)
      .single();

    if (listing) {
      await supabase
        .from("store_listings")
        .update({ whatsapp_count: (listing.whatsapp_count || 0) + 1 })
        .eq("id", listingId);
    }
  } catch (error) {
    console.error("Error tracking listing WhatsApp:", error);
  }
}
