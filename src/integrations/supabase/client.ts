import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔍 TEMP DEBUG — REMOVE AFTER CONFIRMATION
console.log("SB_URL =", SUPABASE_URL);
console.log("SB_KEY exists =", !!SUPABASE_ANON_KEY);

export const supabase = createClient<Database>(
  SUPABASE_URL!,
  SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);