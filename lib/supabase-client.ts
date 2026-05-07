// lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

// This is for server-side use (API routes, Server Actions, etc.)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);