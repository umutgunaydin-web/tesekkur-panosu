import "server-only";

import { redirect } from "next/navigation";

import { isAdminRole } from "@/lib/auth-role";
import { createSessionClient } from "@/lib/supabase/session";
import type { ProfileRole } from "@/lib/types";

export { isAdminRole };

export async function getSessionUser() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    role: (profile?.role ?? "user") as ProfileRole,
  };
}

export async function requireAdmin() {
  const user = await getSessionUser();

  if (!user) redirect("/admin/giris");
  if (!isAdminRole(user.role)) redirect("/admin/giris?yetki=yok");

  return user;
}
