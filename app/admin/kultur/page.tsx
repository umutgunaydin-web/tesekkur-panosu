import type { Metadata } from "next";

import { CultureAdmin, type AdminSlide } from "@/components/culture-admin/CultureAdmin";
import { requireAdmin } from "@/lib/auth";
import { mapSlideRow, SLIDE_COLUMNS, type SlideRow } from "@/lib/culture/query";
import { getActiveEmployees } from "@/lib/employees";
import { getSupabaseEnv } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Kültür Ekranı İçerikleri | Teşekkür Panosu" };

export const dynamic = "force-dynamic";

export default async function CultureAdminPage() {
  await requireAdmin();
  const admin = getSupabaseAdminClient();

  const [result, employees] = await Promise.all([
    admin
      ? admin.from("culture_slides").select(SLIDE_COLUMNS).order("sort_order", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    getActiveEmployees(),
  ]);

  if (result.error) console.error("[admin/kultur] içerikler okunamadı:", result.error.message);

  const url = getSupabaseEnv().url;
  const slides = ((result.data ?? []) as unknown as SlideRow[]).map(
    (row) => mapSlideRow(row, url) as AdminSlide,
  );

  return <CultureAdmin slides={slides} employees={employees} />;
}
