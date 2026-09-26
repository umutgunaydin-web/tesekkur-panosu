import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

/**
 * Sunucu tarafı istemci: ilk sayfa yüklemesindeki mesaj listesi ve
 * form gönderimindeki insert için kullanılır. Oturum tutmaz.
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseEnv();

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
