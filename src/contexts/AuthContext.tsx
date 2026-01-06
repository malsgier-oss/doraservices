import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanPhoneForStorage, phoneToInternalEmail } from "@/lib/phoneUtils";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;

  // NOTE: Your DB has `city` (text). `city_id` might not exist yet.
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

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Profile missing - attempt auto-repair using auth metadata
      console.warn("Profile missing for user, attempting auto-repair:", authUser.id);
      const metadata = authUser.user_metadata || {};

      // IMPORTANT: your DB currently has `city` text, so use metadata.city first.
      const repairData: any = {
        user_id: authUser.id,
        full_name: metadata.full_name || null,
        phone: metadata.phone || null,
        city: metadata.city || null, // store city UUID string here for now
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

      // Ensure user_roles entry exists (non-critical)
      try {
        await supabase.from("user_roles").upsert(
          { user_id: authUser.id, role: "user" },
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
    if (user) await fetchProfile(user);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        setTimeout(() => fetchProfile(session.user), 0);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => fetchProfile(session.user), 0);
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
    const cleanedPhone = cleanPhoneForStorage(phone); // local format 09XXXXXXXX
    const internalEmail = phoneToInternalEmail(cleanedPhone);

    console.log("[SIGNUP] cleanedPhone:", cleanedPhone);
    console.log("[SIGNUP] internalEmail:", internalEmail);
    console.log("[SIGNUP] cityId:", cityId);

    // Check if phone already exists in profiles (may be blocked by RLS in some setups)
    const { data: existingProfile, error: existsErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", cleanedPhone)
      .maybeSingle();

    if (existsErr) {
      console.warn("[SIGNUP] existing phone check failed (possibly RLS):", existsErr);
      // Do not hard fail; proceed and rely on unique constraint later if you add it
    } else if (existingProfile) {
      return { error: new Error("This phone is already registered. Please sign in.") };
    }

    // Step 1: Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: cleanedPhone,
          // Store both keys in metadata for forward-compat:
          city: cityId,     // current DB column
          city_id: cityId,  // future DB column
        },
      },
    });

    if (error) {
      console.error("[SIGNUP] supabase.auth.signUp error:", error);
      return { error: error as Error };
    }

    if (!data.user) {
      return { error: new Error("Signup failed: No user returned") };
    }

    // If signUp returns no session (confirmations on), sign in to write profile under RLS
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInError) {
        console.error("[SIGNUP] signIn after signUp failed:", signInError);
        return { error: new Error("Account created but could not be fully initialized. Please contact support.") };
      }
    }

    // Step 2: Create profile
    // IMPORTANT: Your profiles table currently uses `city` (text).
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: data.user.id,
          full_name: fullName,
          phone: cleanedPhone,
          city: cityId, // store city UUID string in city text column for now
          role: "client",
          is_verified: false,
          must_change_password: false,
        } as any,
        { onConflict: "user_id" }
      );

    if (profileError) {
      console.error("[SIGNUP] Profile upsert failed:", profileError);
      await supabase.auth.signOut();
      return { error: new Error("Account creation failed. Please try again.") };
    }

    // Step 3: Add default user role (non-critical)
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
    const internalEmail = phoneToInternalEmail(cleanedPhone);

    console.log("[SIGNIN] internalEmail:", internalEmail);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) {
      console.warn("[SIGNIN] supabase.auth.signInWithPassword error:", error);
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