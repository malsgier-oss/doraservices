export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admin_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          description: string
          id: string
          provider_id: string
          provider_notes: string | null
          scheduled_date: string
          service_id: string
          status: string
          time_slot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          provider_id: string
          provider_notes?: string | null
          scheduled_date: string
          service_id: string
          status?: string
          time_slot: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          provider_id?: string
          provider_notes?: string | null
          scheduled_date?: string
          service_id?: string
          status?: string
          time_slot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_upload_jobs: {
        Row: {
          admin_id: string
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_items: number
          file_url: string | null
          id: string
          processed_items: number
          status: string
          total_items: number
        }
        Insert: {
          admin_id: string
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          file_url?: string | null
          id?: string
          processed_items?: number
          status?: string
          total_items?: number
        }
        Update: {
          admin_id?: string
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          file_url?: string | null
          id?: string
          processed_items?: number
          status?: string
          total_items?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          archived_at: string | null
          authorization_note: string | null
          authorization_status: string
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          location: string | null
          name: string
          operational_status: string
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          authorization_note?: string | null
          authorization_status?: string
          category: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          operational_status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          authorization_note?: string | null
          authorization_status?: string
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          operational_status?: string
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          caller_id: string
          created_at: string
          id: string
          provider_id: string
          service_id: string
        }
        Insert: {
          caller_id: string
          created_at?: string
          id?: string
          provider_id: string
          service_id: string
        }
        Update: {
          caller_id?: string
          created_at?: string
          id?: string
          provider_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          display_order?: number
          icon: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          region: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          region?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          region?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          archived_at: string | null
          business_id: string
          category: string | null
          clicks_count: number | null
          created_at: string
          description: string | null
          discount: string
          discount_type: string | null
          expires_at: string | null
          featured: boolean
          id: string
          image_url: string | null
          promo_code: string | null
          start_date: string | null
          status: string | null
          terms_conditions: string | null
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          archived_at?: string | null
          business_id: string
          category?: string | null
          clicks_count?: number | null
          created_at?: string
          description?: string | null
          discount: string
          discount_type?: string | null
          expires_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          promo_code?: string | null
          start_date?: string | null
          status?: string | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          archived_at?: string | null
          business_id?: string
          category?: string | null
          clicks_count?: number | null
          created_at?: string
          description?: string | null
          discount?: string
          discount_type?: string | null
          expires_at?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          promo_code?: string | null
          start_date?: string | null
          status?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          city_id: string | null
          created_at: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          notes: string | null
          phone: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          phone: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          notes?: string | null
          phone?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_messages: {
        Row: {
          content: string
          created_at: string
          delivery_count: number
          id: string
          is_read: boolean
          scheduled_at: string | null
          sender_id: string
          sent_at: string | null
          target_audience: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          delivery_count?: number
          id?: string
          is_read?: boolean
          scheduled_at?: string | null
          sender_id: string
          sent_at?: string | null
          target_audience?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          delivery_count?: number
          id?: string
          is_read?: boolean
          scheduled_at?: string | null
          sender_id?: string
          sent_at?: string | null
          target_audience?: string
          title?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      posts: {
        Row: {
          business_id: string | null
          comments_count: number
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          city_id: string | null
          created_at: string
          full_name: string | null
          id: string
          is_verified: boolean | null
          availability_status: string | null
          availability_updated_at: string | null
          must_change_password: boolean | null
          phone: string | null
          points: number
          provider_status: string | null
          role: string | null
          status: string
          sub_city: string | null
          suspended_at: string | null
          suspended_reason: string | null
          tier: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          availability_status?: string | null
          availability_updated_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          points?: number
          provider_status?: string | null
          role?: string | null
          status?: string
          sub_city?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tier?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          city_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          availability_status?: string | null
          availability_updated_at?: string | null
          must_change_password?: boolean | null
          phone?: string | null
          points?: number
          provider_status?: string | null
          role?: string | null
          status?: string
          sub_city?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_stats: {
        Row: {
          profile_views: number
          provider_id: string
          total_calls: number
          total_favorites: number
          updated_at: string
        }
        Insert: {
          profile_views?: number
          provider_id: string
          total_calls?: number
          total_favorites?: number
          updated_at?: string
        }
        Update: {
          profile_views?: number
          provider_id?: string
          total_calls?: number
          total_favorites?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          is_active: boolean
          player_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean
          player_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          is_active?: boolean
          player_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_prompts: {
        Row: {
          call_log_id: string | null
          created_at: string
          dismissed_at: string | null
          id: string
          prompt_sent_at: string | null
          provider_id: string
          reviewed_at: string | null
          service_id: string
          status: string
          trigger_at: string
          user_id: string
        }
        Insert: {
          call_log_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          prompt_sent_at?: string | null
          provider_id: string
          reviewed_at?: string | null
          service_id: string
          status?: string
          trigger_at: string
          user_id: string
        }
        Update: {
          call_log_id?: string | null
          created_at?: string
          dismissed_at?: string | null
          id?: string
          prompt_sent_at?: string | null
          provider_id?: string
          reviewed_at?: string | null
          service_id?: string
          status?: string
          trigger_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_prompts_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_prompts_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          content: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          content?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          content?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_businesses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      service_reviews: {
        Row: {
          admin_hidden: boolean
          content: string | null
          created_at: string
          id: string
          is_flagged: boolean
          provider_id: string
          rating: number
          service_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_hidden?: boolean
          content?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          provider_id: string
          rating: number
          service_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_hidden?: boolean
          content?: string | null
          created_at?: string
          id?: string
          is_flagged?: boolean
          provider_id?: string
          rating?: number
          service_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          admin_note: string | null
          approval_status: string
          category: string
          city: string | null
          created_at: string
          description: string | null
          featured_order: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_paused: boolean
          is_visible: boolean
          price: number | null
          provider_name: string | null
          provider_phone: string | null
          sub_city: string | null
          title: string
          updated_at: string
          user_id: string | null
          views_count: number
        }
        Insert: {
          admin_note?: string | null
          approval_status?: string
          category: string
          city?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_paused?: boolean
          is_visible?: boolean
          price?: number | null
          provider_name?: string | null
          provider_phone?: string | null
          sub_city?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Update: {
          admin_note?: string | null
          approval_status?: string
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          featured_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_paused?: boolean
          is_visible?: boolean
          price?: number | null
          provider_name?: string | null
          provider_phone?: string | null
          sub_city?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          views_count?: number
        }
        Relationships: []
      }
      sub_cities: {
        Row: {
          city_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          color: string | null
          created_at: string | null
          display_order: number | null
          icon: string
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          color?: string | null
          created_at?: string | null
          display_order?: number | null
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "platform_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reports: {
        Row: {
          call_log_id: string | null
          created_at: string
          id: string
          reason: string
          report_type: string
          reported_business_id: string | null
          reported_deal_id: string | null
          reported_service_id: string | null
          reported_user_id: string | null
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          call_log_id?: string | null
          created_at?: string
          id?: string
          reason: string
          report_type: string
          reported_business_id?: string | null
          reported_deal_id?: string | null
          reported_service_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          call_log_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          report_type?: string
          reported_business_id?: string | null
          reported_deal_id?: string | null
          reported_service_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_call_log_id_fkey"
            columns: ["call_log_id"]
            isOneToOne: false
            referencedRelation: "call_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reports_reported_service_id_fkey"
            columns: ["reported_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: 
      
hub_banners: {
  Row: {
    id: string
    title_ar: string
    subtitle_ar: string | null
    cta_text_ar: string | null
    image_path: string
    target_type: string
    target_category_id: string | null
    target_url: string | null
    city_id: string | null
    display_order: number
    is_active: boolean
    start_at: string | null
    end_at: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    title_ar: string
    subtitle_ar?: string | null
    cta_text_ar?: string | null
    image_path: string
    target_type?: string
    target_category_id?: string | null
    target_url?: string | null
    city_id?: string | null
    display_order?: number
    is_active?: boolean
    start_at?: string | null
    end_at?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    title_ar?: string
    subtitle_ar?: string | null
    cta_text_ar?: string | null
    image_path?: string
    target_type?: string
    target_category_id?: string | null
    target_url?: string | null
    city_id?: string | null
    display_order?: number
    is_active?: boolean
    start_at?: string | null
    end_at?: string | null
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "hub_banners_city_id_fkey"
      columns: ["city_id"]
      isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "hub_banners_target_category_id_fkey"
      columns: ["target_category_id"]
      isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },
  ]
}
hub_shelves: {
  Row: {
    id: string
    title_ar: string
    shelf_type: string
    category_id: string | null
    city_id: string | null
    display_order: number
    is_active: boolean
    max_items: number
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    title_ar: string
    shelf_type?: string
    category_id?: string | null
    city_id?: string | null
    display_order?: number
    is_active?: boolean
    max_items?: number
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    title_ar?: string
    shelf_type?: string
    category_id?: string | null
    city_id?: string | null
    display_order?: number
    is_active?: boolean
    max_items?: number
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "hub_shelves_category_id_fkey"
      columns: ["category_id"]
      isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "hub_shelves_city_id_fkey"
      columns: ["city_id"]
      isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },
  ]
}
hub_shelf_items: {
  Row: {
    id: string
    shelf_id: string
    category_id: string
    display_order: number
    created_at: string
  }
  Insert: {
    id?: string
    shelf_id: string
    category_id: string
    display_order?: number
    created_at?: string
  }
  Update: {
    id?: string
    shelf_id?: string
    category_id?: string
    display_order?: number
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "hub_shelf_items_category_id_fkey"
      columns: ["category_id"]
      isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "hub_shelf_items_shelf_id_fkey"
      columns: ["shelf_id"]
      isOneToOne: false
      referencedRelation: "hub_shelves"
      referencedColumns: ["id"]
    },
  ]
}

hub_suggestions: {
        Row: {
          id: string
          type: string
          label_en: string | null
          label_ar: string | null
          display_order: number | null
          is_active: boolean | null
          city_key: string | null
          action_type: string | null
          action_value: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          label_en?: string | null
          label_ar?: string | null
          display_order?: number | null
          is_active?: boolean | null
          city_key?: string | null
          action_type?: string | null
          action_value?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          label_en?: string | null
          label_ar?: string | null
          display_order?: number | null
          is_active?: boolean | null
          city_key?: string | null
          action_type?: string | null
          action_value?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_pages: {
        Row: {
          slug: string
          title_en: string | null
          title_ar: string | null
          content_en: string | null
          content_ar: string | null
          is_published: boolean | null
          updated_at: string
        }
        Insert: {
          slug: string
          title_en?: string | null
          title_ar?: string | null
          content_en?: string | null
          content_ar?: string | null
          is_published?: boolean | null
          updated_at?: string
        }
        Update: {
          slug?: string
          title_en?: string | null
          title_ar?: string | null
          content_en?: string | null
          content_ar?: string | null
          is_published?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_notification: {
        Args: { p_content: string; p_title: string; p_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "business" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "business", "admin"],
    },
  },
} as const
