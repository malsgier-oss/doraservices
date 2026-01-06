import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanPhoneForStorage, phoneToInternalEmail } from "@/lib/phoneUtils";

interface Profile {
  id: string;
  user_id: string | null;

  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;

  city: string | null;
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
  signUp: (
    phone: string,
    password: string,
    fullName: string,
    cityId: string
  ) => Promise<{ error: Error | null }>;
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

  // Create a profile if missing, then return the profile row
  const ensureProfile = async (authUser: User): Promise<Profile | null> => {
    const meta = (authUser.user_metadata || {}) as Record<string, any>;

    const cleanedPhoneFromMeta =
      typeof meta.phone === "string" ? cleanPhoneForStorage(meta.phone) : null;

    const fullNameFromMeta =
      typeof meta.full_name === "string" ? meta.full_name : null;

    const cityFromMeta =
      typeof meta.city_id === "string"
        ? meta.city_id
        : typeof meta.city === "string"
        ? meta.city
        : null;

    // 1) try fetch
    const { data: existing, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (fetchError) {
      console.error("[ensureProfile] fetch error:", fetchError);
      return null;
    }

    if (existing) return existing as Profile;

    // 2) create if missing
    // NOTE: we only insert safe minimal fields; DB defaults handle the rest.
    const insertPayload: Record<string, any> = {
      user_id: authUser.id,
      full_name: fullNameFromMeta,
      phone: cleanedPhoneFromMeta,
      city: cityFromMeta,
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      // If it already got created in parallel, re-fetch once
      console.warn("[ensureProfile] insert error, retrying fetch:", insertError);

      const { data: retry, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (retryError) {
        console.error("[ensureProfile] retry fetch error:", retryError);
        return null;
      }

      return (retry as Profile) ?? null;
    }

    return created as Profile;
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

        if (sess?.user) {
          // Ensure profile exists immediately
          void fetchProfile(sess.user);
        } else {
          setProfile(null);
        }
      } catch (e) {
        if (!mounted) return;
        console.error("[getSession] exception:", e);
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mounted) return;

      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      setLoading(false);

      console.log("[AUTH STATE CHANGE]", { event, hasSession: !!sess });

      if (sess?.user) {
        void fetchProfile(sess.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    phone: string,
    password: string,
    fullName: string,
    cityId: string
  ) => {
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmail(cleanedPhone);

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: cleanedPhone,
          city: cityId,
          city_id: cityId,
        },
      },
    });

    console.log("[SIGNUP RESULT]", {
      error: error?.message,
      userId: data?.user?.id,
      email: data?.user?.email,
      hasSession: !!data?.session,
    });

    if (error) return { error: error as Error };
    if (!data.user) return { error: new Error("Signup failed: No user returned") };

    // If Supabase didn't return a session (e.g., email confirmation ON),
    // try an immediate sign-in. If it fails due to confirmation, we return a clear error.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInErr) {
        // Common message when email confirmation is required:
        // "Email not confirmed"
        return {
          error: new Error(signInErr.message || "Signup created but auto-login failed"),
        };
      }
    }

    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmail(cleanedPhone);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) {
      return { error: new Error(error.message || "Invalid phone or password") };
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