import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone, phoneToInternalEmail } from "@/lib/phoneUtils";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        setProfile(data as Profile);
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
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check for existing session (initial load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch profile after setting user
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
    });

    // Listen for auth changes (login/logout/token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      
      // Fetch profile on auth change
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
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
    const normalizedPhone = normalizePhone(phone);
    const internalEmail = phoneToInternalEmail(normalizedPhone);
    const redirectUrl = `${window.location.origin}/`;

    // Check if phone already exists in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      return { error: new Error("This phone is already registered. Please sign in.") };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email: internalEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          city_id: cityId,
        },
      },
    });

    if (error) {
      return { error: error as Error };
    }

    // Create/upsert profile with phone and city
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          user_id: data.user.id,
          full_name: fullName,
          phone: normalizedPhone,
          city_id: cityId,
          role: 'client',
          is_verified: false,
          must_change_password: false,
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Add default user role (ignore if exists)
      await supabase.from("user_roles").insert({ 
        user_id: data.user.id, 
        role: "user" 
      });
    }
    
    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    const normalizedPhone = normalizePhone(phone);
    const internalEmail = phoneToInternalEmail(normalizedPhone);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });
    
    // Generic error message to not leak whether phone exists
    if (error) {
      return { error: new Error("Invalid phone or password") };
    }
    
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      loading, 
      profileLoading,
      signUp, 
      signIn, 
      signOut,
      refreshProfile 
    }}>
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
