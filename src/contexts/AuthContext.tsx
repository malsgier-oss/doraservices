import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { cleanPhoneForStorage, phoneToInternalEmail } from "@/lib/phoneUtils";

interface Profile {
  id: string; // profiles.id = auth.user.id
  user_id: string | null; // exists in your table too

  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;

  // current DB reality
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

  const fetchProfile = async (authUser: User) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("[fetchProfile] error:", error);
        setProfile(null);
        return;
      }

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Auto-repair profile if missing (may fail under RLS; that's OK)
      const metadata = authUser.user_metadata || {};
      const repairData: any = {
        id: authUser.id,
        user_id: authUser.id, // keep both aligned

        full_name: metadata.full_name || null,
        phone: metadata.phone || null,
        city: metadata.city || metadata.city_id || null,

        role: "client",
        is_verified: false,
        must_change_password: false,
      };

      const { data: repaired, error: repairError } = await supabase
        .from("profiles")
        .upsert(repairData, { onConflict: "id" })
        .select()
        .single();

      if (repairError) {
        console.error("[fetchProfile] auto-repair failed:", repairError);
        setProfile(null);
        return;
      }

      setProfile(repaired as Profile);
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) setTimeout(() => fetchProfile(session.user), 0);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) setTimeout(() => fetchProfile(session.user), 0);
      else setProfile(null);
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
    const cleanedPhone = cleanPhoneForStorage(phone); // 09XXXXXXXX
    const internalEmail = phoneToInternalEmail(cleanedPhone); // 091XXXXXXXX@dora.ly

    console.log("[SIGNUP] cleanedPhone:", cleanedPhone);
    console.log("[SIGNUP] internalEmail:", internalEmail);
    console.log("[SIGNUP] cityId:", cityId);

    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: cleanedPhone,
          city: cityId,
          city_id: cityId, // forward compatible
        },
      },
    });

    if (error) {
      console.error("[SIGNUP] auth.signUp error:", error);
      return { error: error as Error };
    }
    if (!data.user) {
      return { error: new Error("Signup failed: No user returned") };
    }

    // If confirmations are on, signUp might return no session.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });

      if (signInError) {
        console.error("[SIGNUP] signIn after signUp failed:", signInError);
        return {
          error: new Error(
            "Account created but could not be initialized. Please contact support."
          ),
        };
      }
    }

    // IMPORTANT: RLS must allow insert where auth.uid() = id
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,      // required for RLS
        user_id: data.user.id, // keep consistent with your schema

        full_name: fullName,
        phone: cleanedPhone,
        city: cityId,

        role: "client",
        is_verified: false,
        must_change_password: false,
      } as any,
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[SIGNUP] profile upsert failed:", profileError);
      await supabase.auth.signOut();
      return { error: profileError as any };
    }

    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmail(cleanedPhone); // 091XXXXXXXX@dora.ly

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error) {
      console.warn("[SIGNIN] signInWithPassword error:", error);
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
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}