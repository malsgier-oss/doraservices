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

  const ensureProfile = async (authUser: User): Promise<Profile | null> => {
    const meta = (authUser.user_metadata || {}) as Record<string, unknown>;

    const cleanedPhoneFromMeta =
      typeof meta.phone === "string" ? cleanPhoneForStorage(meta.phone) : null;

    const fullNameFromMeta = typeof meta.full_name === "string" ? meta.full_name : null;
    const cityIdFromMeta = typeof meta.city_id === "string" ? meta.city_id : null;
    const cityNameFromMeta = typeof meta.city === "string" ? meta.city : null;

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

    const insertPayload: TablesInsert<"profiles"> = {
      user_id: authUser.id,
      full_name: fullNameFromMeta,
      phone: cleanedPhoneFromMeta,
      city_id: cityIdFromMeta,
      city: cityNameFromMeta,
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      const { data: retry, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (retryError) {
        console.error("[ensureProfile] insert+retry fetch error:", insertError, retryError);
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

    if (error) return { error: new Error(error.message) };
    if (!data.user) return { error: new Error("Signup failed: No user returned") };

    // If session missing (email confirmation ON, or any odd edge case), try login
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInErr) {
        return { error: new Error(signInErr.message || "Signup created but auto-login failed") };
      }
    }

    const { data: sessData } = await supabase.auth.getSession();
    const sessUser = sessData.session?.user;
    if (!sessUser) return { error: new Error("Signup failed: could not establish session") };

    const prof = await ensureProfile(sessUser);
    if (!prof) {
      await supabase.auth.signOut();
      return { error: new Error("Signup failed: could not create profile. Please try again.") };
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

    if (error) return { error: new Error(error.message || "Invalid phone or password") };

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