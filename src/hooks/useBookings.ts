import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Booking {
  id: string;
  service_id: string;
  user_id: string;
  provider_id: string;
  description: string;
  scheduled_date: string;
  time_slot: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  provider_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  service_title?: string;
  provider_name?: string;
  provider_avatar?: string;
  customer_name?: string;
  customer_avatar?: string;
}

export function useBookings() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching my bookings:", error);
      return;
    }

    // Get service details and provider profiles
    const serviceIds = [...new Set(data?.map(b => b.service_id) || [])];
    const providerIds = [...new Set(data?.map(b => b.provider_id) || [])];

    const [{ data: services }, { data: profiles }] = await Promise.all([
      supabase.from("services").select("id, title").in("id", serviceIds),
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", providerIds),
    ]);

    const serviceMap = new Map(services?.map(s => [s.id, s]) || []);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedBookings = (data || []).map(booking => ({
      ...booking,
      status: booking.status as Booking["status"],
      service_title: serviceMap.get(booking.service_id)?.title || "Service",
      provider_name: profileMap.get(booking.provider_id)?.full_name || "Provider",
      provider_avatar: profileMap.get(booking.provider_id)?.avatar_url || "",
    }));

    setMyBookings(enrichedBookings);
    setLoading(false);
  };

  const fetchIncomingBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching incoming bookings:", error);
      return;
    }

    // Get service details and customer profiles
    const serviceIds = [...new Set(data?.map(b => b.service_id) || [])];
    const customerIds = [...new Set(data?.map(b => b.user_id) || [])];

    const [{ data: services }, { data: profiles }] = await Promise.all([
      supabase.from("services").select("id, title").in("id", serviceIds),
      supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", customerIds),
    ]);

    const serviceMap = new Map(services?.map(s => [s.id, s]) || []);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const enrichedBookings = (data || []).map(booking => ({
      ...booking,
      status: booking.status as Booking["status"],
      service_title: serviceMap.get(booking.service_id)?.title || "Service",
      customer_name: profileMap.get(booking.user_id)?.full_name || "Customer",
      customer_avatar: profileMap.get(booking.user_id)?.avatar_url || "",
    }));

    setIncomingBookings(enrichedBookings);
  };

  useEffect(() => {
    if (user) {
      fetchMyBookings();
      fetchIncomingBookings();
    }
  }, [user]);

  const createBooking = async (bookingData: {
    service_id: string;
    provider_id: string;
    description: string;
    scheduled_date: Date;
    time_slot: string;
  }) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        service_id: bookingData.service_id,
        user_id: user.id,
        provider_id: bookingData.provider_id,
        description: bookingData.description,
        scheduled_date: bookingData.scheduled_date.toISOString().split("T")[0],
        time_slot: bookingData.time_slot,
        status: "pending",
      })
      .select()
      .single();

    if (!error && data) {
      await fetchMyBookings();
    }

    return { data, error };
  };

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    const { data, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) {
      await fetchMyBookings();
      await fetchIncomingBookings();
    }

    return { data, error };
  };

  const cancelBooking = async (id: string) => {
    return updateBookingStatus(id, "cancelled");
  };

  const acceptBooking = async (id: string) => {
    return updateBookingStatus(id, "in_progress");
  };

  const completeBooking = async (id: string) => {
    return updateBookingStatus(id, "completed");
  };

  return {
    myBookings,
    incomingBookings,
    loading,
    createBooking,
    cancelBooking,
    acceptBooking,
    completeBooking,
    refreshBookings: () => {
      fetchMyBookings();
      fetchIncomingBookings();
    },
  };
}
