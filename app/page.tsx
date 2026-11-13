import type { Metadata } from "next";

import { CultureScreen } from "@/components/culture/CultureScreen";
import { fetchPublishedSlides } from "@/lib/culture/query";
import { getSiteUrl, getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import { getLatestMessages, getMonthlyThanksCount } from "@/lib/messages";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kültür Ekranı | AloTech" };

// TV'deki sabit adres (/) kültür ekranını açar; her açılışta güncel içerikle başlar.
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ slayt?: string }>;
}) {
  const { slayt } = await searchParams;
  const [initialMessages, initialMonthlyCount, slides] = await Promise.all([
    getLatestMessages(),
    getMonthlyThanksCount(),
    isSupabaseConfigured()
      ? fetchPublishedSlides(getSupabaseServerClient(), getSupabaseEnv().url)
      : Promise.resolve([]),
  ]);

  return (
    <CultureScreen
      initialMessages={initialMessages}
      initialMonthlyCount={initialMonthlyCount}
      submitUrl={`${getSiteUrl().replace(/\/$/, "")}/gonder`}
      initialSlides={slides ?? []}
      initialSlide={Math.max(0, Number(slayt ?? "1") - 1) || 0}
    />
  );
}
