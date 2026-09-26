"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/types";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Tarayıcı tarafında tek bir Supabase istemcisi paylaşılır; böylece her
 * render'da yeni bir realtime soketi açılmaz.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, anonKey);

  return browserClient;
}
