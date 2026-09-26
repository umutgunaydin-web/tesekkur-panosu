import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EmployeePublic } from "@/lib/types";

/** Form açıldığında bir kez yüklenen aktif çalışan dizini. */
export async function getActiveEmployees(): Promise<EmployeePublic[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, email, avatar_url")
    .eq("is_active", true);

  if (error) {
    console.error("[employees] dizin okunamadı:", error.message);
    return [];
  }

  return (data ?? []).sort((left, right) =>
    left.name.localeCompare(right.name, "tr"),
  );
}
