// Store-related types for business store system

export interface StoreListing {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  price: number | null;
  currency: string;
  image_urls: string[];
  status: 'draft' | 'active' | 'paused' | 'archived';
  views_count: number;
  calls_count: number;
  whatsapp_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface StoreStats {
  total_views: number;
  total_calls: number;
  total_whatsapp: number;
  active_listings_count: number;
}

export interface StoreSettings {
  logo_url: string | null;
  banner_url: string | null;
  about_text: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  address: string | null;
  city_id: string | null;
}

export interface BusinessStore {
  id: string;
  user_id: string;
  name: string;
  category: string;
  location: string | null;
  description: string | null;
  image_url: string | null;
  authorization_status: string;
  operational_status: string;
  featured: boolean;
  // Store identity fields (Phase 1)
  logo_url: string | null;
  banner_url: string | null;
  about_text: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  address: string | null;
  city_id: string | null;
  created_at: string;
  updated_at: string;
}
