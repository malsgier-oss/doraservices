import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { cleanPhoneForStorage, phoneToInternalEmail, isValidLibyanPhone } from "@/lib/phoneUtils";

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

  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;

  signUp: (
    phone: string,
    password: string,
    fullName: string,
    cityId: string,
    cityName: string,
  ) => Promise<{ error: Error | null }>;

  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
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

    const payload: TablesInsert<"profiles"> = {
      user_id: authUser.id,
      full_name: overrides?.fullName ?? (existing ? undefined : metaFullName),
      phone: overrides?.phone ?? (existing ? undefined : metaPhone),
      city_id: overrides?.cityId ?? (existing ? undefined : metaCityId),
      city: overrides?.cityName ?? (existing ? undefined : metaCityName),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: overrides?.fullName ?? undefined,
          phone: overrides?.phone ?? undefined,
          city_id: overrides?.cityId ?? undefined,
          city: overrides?.cityName ?? undefined,
        })
        .eq("user_id", authUser.id);

      if (updateError) {
        console.error("[ensureProfile] update error:", updateError);
        return existing as Profile;
      }
    } else {
      const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
      if (upsertError) {
        console.error("[ensureProfile] upsert error:", upsertError);
        return null;
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

  const signUp = async (phone: string, password: string, fullName: string, cityId: string, cityName: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);

    if (!isValidLibyanPhone(cleanedPhone)) {
      return { error: new Error("Invalid phone format (09XXXXXXXX)") };
    }

    const internalEmail = phoneToInternalEmail(cleanedPhone);

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: cleanedPhone,
          city_id: cityId,
          city: cityName,
        },
      },
    });

    if (error) {
      console.error("[signUp] error:", error);
      return { error: new Error(error.message) };
    }

    if (!data.user) {
      return { error: new Error("Signup failed: No user returned") };
    }

    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInErr) {
        console.error("[signUp] auto-login failed:", signInErr);

        const msg = String(signInErr.message || "").toLowerCase();
        if (msg.includes("email not confirmed")) {
          return {
            error: new Error(
              "Email confirmation is ON in Supabase. Turn it OFF (Auth → Providers → Email → Confirm email = OFF), then signup again.",
            ),
          };
        }
        return { error: new Error(signInErr.message) };
      }
    }

    // Ensure profile exists and fill with overrides
    await ensureProfile(data.user, {
      fullName,
      phone: cleanedPhone,
      cityId,
      cityName,
    });

    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);

    if (!isValidLibyanPhone(cleanedPhone)) {
      return { error: new Error("Invalid phone format (09XXXXXXXX)") };
    }

    const internalEmail = phoneToInternalEmail(cleanedPhone);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) return { error: new Error(error.message) };

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
        signUp,
        signIn,
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
