import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cleanPhoneForStorage, isValidLibyanPhone, libyaPhoneToE164 } from "@/lib/phoneUtils";

const isProviderLike = (role: string) => {
  const r = (role || "").toLowerCase();
  return r === "provider" || r === "business";
};

interface Profile {
  id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  city_id?: string | null;
  sub_city: string | null;
  provider_status: string | null;
  role: string | null;

  status: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;

  // Note: some deployments do not have an `is_verified` column anymore.
  // Do not rely on this flag for core navigation.
  is_verified?: boolean | null;
  availability_status?: string | null;
  availability_updated_at?: string | null;

  // Marketplace Controls
  provider_mode?: boolean;
  marketplace_enabled?: boolean;

  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;

  requestOtp: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (
    phone: string,
    code: string,
  ) => Promise<{ data?: unknown; error: Error | null }>;

  // Used after OTP verify to fill/update profile fields (name, city, etc.)
  updateProfileBasics: (overrides: EnsureOverrides) => Promise<{ error: Error | null }>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

type EnsureOverrides = {
  fullName?: string | null;
  phone?: string | null;
  cityId?: string | null;
  cityName?: string | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  // Used to suppress app-level auth redirects during controlled auth flows (e.g., signup that we immediately sign out).
  const ignoreAuthEventsRef = useRef(0);

  const ensureProfile = async (authUser: User, overrides?: EnsureOverrides): Promise<Profile | null> => {
    const { data: existing, error: fetchExistingError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (fetchExistingError) {
      console.error("[ensureProfile] fetch existing error:", fetchExistingError);
    }

    if (existing && !overrides) {
      return existing as Profile;
    }

    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;

    const metaPhone = typeof meta.phone === "string" ? cleanPhoneForStorage(meta.phone) : null;
    const metaFullName = typeof meta.full_name === "string" ? (meta.full_name as string) : null;
    const metaCityId = typeof meta.city_id === "string" ? (meta.city_id as string) : null;
    const metaCityName = typeof meta.city === "string" ? (meta.city as string) : null;

    if (existing) {
      // Profile exists - use update, but don't touch is_verified (it's already set by trigger or previous operations)
      const updateData: any = {};
      if (overrides?.fullName !== undefined) updateData.full_name = overrides.fullName;
      if (overrides?.phone !== undefined) updateData.phone = overrides.phone;
      if (overrides?.cityId !== undefined) updateData.city_id = overrides.cityId;
      if (overrides?.cityName !== undefined) updateData.city = overrides.cityName;
      
      // If this user is not a provider, ensure provider_status stays null.
      if (overrides && !isProviderLike(String(existing.role || "user"))) {
        updateData.provider_status = null;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("user_id", authUser.id);

        if (updateError) {
          console.error("[ensureProfile] update error:", updateError);
          return existing as Profile;
        }
      }
    } else {
      // Profile doesn't exist - create new one with is_verified = false
      const insertPayload: TablesInsert<"profiles"> = {
        user_id: authUser.id,
        full_name: overrides?.fullName ?? metaFullName ?? null,
        phone: overrides?.phone ?? metaPhone ?? null,
        city_id: overrides?.cityId ?? metaCityId ?? null,
        city: overrides?.cityName ?? metaCityName ?? null,
        role: "user",
        provider_status: null,
        is_verified: false, // Explicitly set to false for new signups
      };

      const { error: insertError } = await supabase
        .from("profiles")
        .insert(insertPayload);

      if (insertError) {
        console.error("[ensureProfile] insert error:", insertError);
        // If insert fails (e.g., profile was created by trigger between check and insert),
        // try to fetch it and update instead
        const { data: triggerCreated } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", authUser.id)
          .maybeSingle();
        
        if (triggerCreated) {
          // Profile was created by trigger, update it with our data
          const updateData: any = {};
          if (insertPayload.full_name) updateData.full_name = insertPayload.full_name;
          if (insertPayload.phone) updateData.phone = insertPayload.phone;
          if (insertPayload.city_id) updateData.city_id = insertPayload.city_id;
          if (insertPayload.city) updateData.city = insertPayload.city;
          
          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("profiles")
              .update(updateData)
              .eq("user_id", authUser.id);
          }
          
          // Ensure is_verified is false (in case trigger didn't set it)
          await supabase
            .from("profiles")
            .update({ is_verified: false })
            .eq("user_id", authUser.id)
            .is("is_verified", null); // Only update if currently null
        } else {
          return null;
        }
      }
    }

    const { data: prof, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[ensureProfile] fetch after write error:", fetchError);
      return (existing as Profile) ?? null;
    }

    return (prof as Profile) ?? null;
  };

  const fetchProfile = async (authUser: User) => {
    setProfileLoading(true);
    try {
      const prof = await ensureProfile(authUser);
      setProfile(prof);
    } catch (e) {
      console.error("[fetchProfile] exception:", e);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) console.error("[getSession] error:", error);

        const sess = data.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);

        if (sess?.user) void fetchProfile(sess.user);
        else setProfile(null);
      } catch (e) {
        if (!mounted) return;
        console.error("[getSession] exception:", e);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, sess) => {
      if (!mounted) return;
      if (ignoreAuthEventsRef.current > 0) return;

      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      setLoading(false);

      if (sess?.user) void fetchProfile(sess.user);
      else setProfile(null);
    });

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  
  const requestOtp = async (phone: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);

    if (!isValidLibyanPhone(cleanedPhone)) {
      return { error: new Error("Invalid phone format (09XXXXXXXX)") };
    }

    const e164 = libyaPhoneToE164(cleanedPhone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: {
        // Ensure user is created on first verification
        shouldCreateUser: true,
        // Keep phone in metadata for profile creation
        data: { phone: cleanedPhone },
      },
    });

    return { error: error ? new Error(error.message) : null };
  };

  const verifyOtp = async (phone: string, code: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);

    if (!isValidLibyanPhone(cleanedPhone)) {
      return { error: new Error("Invalid phone format (09XXXXXXXX)") };
    }

    const e164 = libyaPhoneToE164(cleanedPhone);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: "sms",
    });

    return { data, error: error ? new Error(error.message) : null };
  };

  const updateProfileBasics = async (overrides: EnsureOverrides) => {
    // After OTP verification there can be a brief race where `user` in context is still null.
    // In that case, pull a fresh user from Supabase before attempting profile writes.
    let authUser = user;
    if (!authUser) {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return { error: new Error("Not signed in") };
      authUser = data.user;
    }

    const profile = await ensureProfile(authUser, overrides);
    if (!profile) return { error: new Error("Failed to update profile") };
    setProfile(profile);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        requestOtp,
        verifyOtp,
        updateProfileBasics,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
