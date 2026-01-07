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
  is_verified: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (phone: string, password: string, fullName: string, cityId: string) => Promise<{ error: Error | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  /**
   * ✅ Idempotent profile ensure:
   * - Always UPSERT by user_id
   * - Then read back the row
   * This prevents “signup failed” due to duplicate key / race conditions.
   */
  const ensureProfile = async (authUser: User): Promise<Profile | null> => {
    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;

    const cleanedPhoneFromMeta = typeof meta.phone === "string" ? cleanPhoneForStorage(meta.phone) : null;

    const fullNameFromMeta = typeof meta.full_name === "string" ? meta.full_name : null;
    const cityIdFromMeta = typeof meta.city_id === "string" ? meta.city_id : null;
    const cityNameFromMeta = typeof meta.city === "string" ? meta.city : null;

    const payload: TablesInsert<"profiles"> = {
      user_id: authUser.id,
      full_name: fullNameFromMeta,
      phone: cleanedPhoneFromMeta,
      city_id: cityIdFromMeta,
      city: cityNameFromMeta,
      // do NOT set required fields here unless you want to override defaults
      // (points/tier/status/role/is_active should be handled by DB defaults)
    };

    // 1) UPSERT (safe if row already exists)
    const { error: upsertError } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });

    if (upsertError) {
      console.error("[ensureProfile] upsert error:", upsertError);
      return null;
    }

    // 2) Read back the profile
    const { data: prof, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[ensureProfile] fetch error:", fetchError);
      return null;
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

  const signUp = async (phone: string, password: string, fullName: string, cityId: string) => {
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

    // If session missing (email confirmation ON), auto-login may fail.
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

        return { error: new Error(signInErr.message || "Signup created but auto-login failed") };
      }
    }

    const { data: sessData } = await supabase.auth.getSession();
    const sessUser = sessData.session?.user;
    if (!sessUser) return { error: new Error("Signup failed: could not establish session") };

    const prof = await ensureProfile(sessUser);
    if (!prof) {
      await supabase.auth.signOut();
      return { error: new Error("Signup failed: profile could not be created/loaded. Please try again.") };
    }

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

    if (error) {
      console.error("[signIn] error:", error);
      return { error: new Error(error.message || "Invalid phone or password") };
    }

    const { data: sessData } = await supabase.auth.getSession();
    const sessUser = sessData.session?.user;
    if (!sessUser) return { error: new Error("Sign in failed: session not available") };

    const prof = await ensureProfile(sessUser);
    if (!prof) {
      await supabase.auth.signOut();
      return { error: new Error("Sign in failed: profile could not be loaded. Please try again.") };
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
