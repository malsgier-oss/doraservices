import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanPhoneForStorage } from "@/lib/phoneUtils";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  city_id: string | null;
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

/**
 * Build a deterministic internal email from a cleaned phone.
 * We intentionally use digits-only to avoid invalid email characters.
 *
 * Example (local): 0912345678 -> 0912345678@phone.dora.ly
 */
function phoneToInternalEmailDigitsOnly(cleanedPhone: string) {
  const digitsOnly = cleanedPhone.replace(/[^\d]/g, "");
  return `${digitsOnly}@phone.dora.ly`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch profile with auto-repair if missing
  const fetchProfile = async (authUser: User) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return;
      }

      // Profile exists
      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Profile missing - attempt auto-repair using auth metadata
      console.warn("Profile missing for user, attempting auto-repair:", authUser.id);
      const metadata = authUser.user_metadata || {};

      const repairData = {
        user_id: authUser.id,
        full_name: metadata.full_name || null,
        phone: metadata.phone || null,
        city_id: metadata.city_id || null,
        role: "client",
        is_verified: false,
        must_change_password: false,
      };

      const { data: repairedProfile, error: repairError } = await supabase
        .from("profiles")
        .upsert(repairData, { onConflict: "user_id" })
        .select()
        .single();

      if (repairError) {
        console.error("Profile auto-repair failed:", repairError);
        setProfile(null);
        return;
      }

      console.log("Profile auto-repaired successfully");
      setProfile(repairedProfile as Profile);

      // Ensure user_roles entry exists (ignore if it already exists)
      try {
        await supabase.from("user_roles").upsert(
          { user_id: authUser.id, role: "user" },
          // NOTE: ignoreDuplicates isn't supported by supabase-js upsert in some versions;
          // but onConflict will prevent duplicates if constraint exists.
          { onConflict: "user_id,role" }
        );
      } catch (e) {
        console.warn("user_roles upsert failed (non-critical):", e);
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial load session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user);
        }, 0);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (phone: string, password: string, fullName: string, cityId: string) => {
    // We accept local format 0912345678 (10 digits) as input.
    // cleanPhoneForStorage should normalize consistently (ideally returns 09XXXXXXXX local).
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmailDigitsOnly(cleanedPhone);

    // IMPORTANT: you do NOT need emailRedirectTo for this internal-email approach.
    // Keeping it harmless, but not required.
    const redirectUrl = `${window.location.origin}/`;

    // 1) Check if phone already exists (avoid duplicates)
    const { data: existingProfile, error: existingErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", cleanedPhone)
      .maybeSingle();

    if (existingErr) {
      // If RLS blocks this read, don't hard fail signup. We'll rely on unique constraints.
      console.warn("Existing profile check error (possibly RLS):", existingErr);
    } else if (existingProfile) {
      return { error: new Error("This phone is already registered. Please sign in.") };
    }

    // Helpful debug logs (keep during testing; remove later if you want)
    console.log("[SIGNUP] phoneRaw:", phone);
    console.log("[SIGNUP] cleanedPhone:", cleanedPhone);
    console.log("[SIGNUP] internalEmail:", internalEmail);

    // 2) Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: cleanedPhone,
          city_id: cityId,
        },
      },
    });

    if (error) {
      console.error("[SIGNUP] Supabase auth.signUp error:", error);
      return { error: error as Error };
    }

    if (!data.user) {
      return { error: new Error("Signup failed: No user returned") };
    }

    // If email confirmations are enabled, signUp may return no session.
    // We sign in immediately to be able to write to RLS-protected tables.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInError) {
        console.error("[SIGNUP] Sign-in after signUp failed:", signInError);
        return {
          error: new Error(
            "Account created but could not be fully initialized. Please contact support."
          ),
        };
      }
    }

    // 3) Create/Upsert profile
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: data.user.id,
        full_name: fullName,
        phone: cleanedPhone,
        city_id: cityId,
        role: "client",
        is_verified: false,
        must_change_password: false,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("[SIGNUP] Profile upsert failed:", profileError);

      // Client cannot delete auth users; best effort is sign out.
      await supabase.auth.signOut();
      return { error: new Error("Account creation failed. Please try again.") };
    }

    // 4) Add default user role (non-critical)
    try {
      const { error: roleError } = await supabase.from("user_roles").upsert(
        { user_id: data.user.id, role: "user" },
        { onConflict: "user_id,role" }
      );

      if (roleError) {
        console.warn("[SIGNUP] Failed to add user role (non-critical):", roleError);
      }
    } catch (e) {
      console.warn("[SIGNUP] user_roles upsert threw (non-critical):", e);
    }

    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmailDigitsOnly(cleanedPhone);

    console.log("[SIGNIN] cleanedPhone:", cleanedPhone, "internalEmail:", internalEmail);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) {
      console.warn("[SIGNIN] Supabase signIn error:", error);
      return { error: new Error("Invalid phone or password") };
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}