import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SavedBusiness {
  id: string;
  user_id: string;
  business_id: string;
  created_at: string;
}

export function useSavedBusinesses() {
  const { user } = useAuth();
  const [savedBusinesses, setSavedBusinesses] = useState<SavedBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSavedBusinesses([]);
      setLoading(false);
      return;
    }

    const fetchSavedBusinesses = async () => {
      const { data, error } = await supabase
        .from("saved_businesses")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching saved businesses:", error);
      } else {
        setSavedBusinesses(data || []);
      }
      setLoading(false);
    };

    fetchSavedBusinesses();
  }, [user]);

  const isBusinessSaved = (businessId: string) => {
    return savedBusinesses.some((sb) => sb.business_id === businessId);
  };

  const toggleSaveBusiness = async (businessId: string) => {
    if (!user) {
      toast({ title: "Please log in", description: "You need to be logged in to save businesses.", variant: "destructive" });
      return;
    }

    const isSaved = isBusinessSaved(businessId);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_businesses")
        .delete()
        .eq("user_id", user.id)
        .eq("business_id", businessId);

      if (error) {
        toast({ title: "Error", description: "Could not unsave business.", variant: "destructive" });
      } else {
        setSavedBusinesses((prev) => prev.filter((sb) => sb.business_id !== businessId));
        toast({ title: "Removed", description: "Business removed from saved." });
      }
    } else {
      const { data, error } = await supabase
        .from("saved_businesses")
        .insert({ user_id: user.id, business_id: businessId })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "Could not save business.", variant: "destructive" });
      } else if (data) {
        setSavedBusinesses((prev) => [...prev, data]);
        toast({ title: "Saved!", description: "Business added to your saved list." });
      }
    }
  };

  return { savedBusinesses, loading, isBusinessSaved, toggleSaveBusiness };
}
