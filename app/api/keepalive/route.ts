import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase'in ücretsiz planı bir süre istek almayan projeyi duraklatır
 * (Kasım 2026'da ekran bu yüzden boş kaldı). Vercel Cron bu adresi her gün
 * bir kez çağırır; tek satırlık bir okuma projeyi etkin tutar.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "supabase_not_configured" }, { status: 500 });
  }

  const { count, error } = await getSupabaseServerClient()
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    console.error("[keepalive]", error.message);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true, employees: count ?? 0, at: new Date().toISOString() });
}
