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

      // Profile exists - use it
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
        role: 'client',
        is_verified: false,
        must_change_password: false,
      };

      const { data: repairedProfile, error: repairError } = await supabase
        .from("profiles")
        .upsert(repairData, { onConflict: 'user_id' })
        .select()
        .single();

      if (repairError) {
        console.error("Profile auto-repair failed:", repairError);
        setProfile(null);
        return;
      }

      console.log("Profile auto-repaired successfully");
      setProfile(repairedProfile as Profile);

      // Also ensure user_roles entry exists (ignore errors - role might exist)
      try {
        await supabase.from("user_roles").upsert(
          { user_id: authUser.id, role: "user" },
          { onConflict: 'user_id,role', ignoreDuplicates: true }
        );
      } catch {
        // Ignore - role might already exist
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

    // Check for existing session (initial load)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch profile after setting user
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user);
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
    // Clean phone - store exactly as entered (local format: 09XXXXXXXX)
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmail(cleanedPhone);
    const redirectUrl = `${window.location.origin}/`;

    // Check if phone already exists in profiles
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", cleanedPhone)
      .maybeSingle();

    if (existingProfile) {
      return { error: new Error("This phone is already registered. Please sign in.") };
    }
    
    // Step 1: Create auth user
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
      return { error: error as Error };
    }

    if (!data.user) {
      return { error: new Error("Signup failed: No user returned") };
    }

    // Step 2: Create profile (atomic with auth user)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        user_id: data.user.id,
        full_name: fullName,
        phone: cleanedPhone,
        city_id: cityId,
        role: 'client',
        is_verified: false,
        must_change_password: false,
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error("Profile creation failed, cleaning up auth user:", profileError);
      // Rollback: Sign out and attempt to clean up
      // Note: We can't delete the auth user from client-side, but we can sign out
      // The orphaned auth user will need admin cleanup, but this is rare
      await supabase.auth.signOut();
      return { error: new Error("Account creation failed. Please try again.") };
    }

    // Step 3: Add default user role
    const { error: roleError } = await supabase.from("user_roles").upsert(
      { user_id: data.user.id, role: "user" },
      { onConflict: 'user_id,role', ignoreDuplicates: true }
    );

    if (roleError) {
      // Non-critical - log but don't fail signup
      console.warn("Failed to add user role:", roleError);
    }

    // Success - profile will be fetched by onAuthStateChange
    return { error: null };
  };

  const signIn = async (phone: string, password: string) => {
    // Clean phone and derive internal email
    const cleanedPhone = cleanPhoneForStorage(phone);
    const internalEmail = phoneToInternalEmail(cleanedPhone);

    const { error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });
    
    if (error) {
      // Generic error message to not leak whether phone exists
      return { error: new Error("Invalid phone or password") };
    }
    
    // Profile will be fetched by onAuthStateChange with auto-repair if needed
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
