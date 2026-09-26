import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * Moderasyon güncellemeleri için. Service role RLS'i aşar;
 * bu istemci yalnızca sunucu kodundan çağrılır.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) return null;

  const { url } = getSupabaseEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
