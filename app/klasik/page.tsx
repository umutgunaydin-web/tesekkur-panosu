import type { Metadata } from "next";

import { AppreciationWall } from "@/components/wall/AppreciationWall";
import { Sidebar } from "@/components/wall/Sidebar";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-role";
import { getSiteUrl } from "@/lib/env";
import { getLatestMessages, getMonthlyThanksCount } from "@/lib/messages";

/**
 * Kültür ekranından önceki teşekkür panosu. Ana adresten kaldırıldı; bir sorun
 * olursa TV geçici olarak bu adrese alınabilsin diye yedek olarak duruyor.
 */
export const metadata: Metadata = { title: "Bir Teşekkür Bırak", robots: { index: false } };

// Kiosk ekranı her açılışta en güncel listeyi almalı.
export const dynamic = "force-dynamic";

export default async function AppreciationWallPage() {
  const [initialMessages, initialMonthlyCount, sessionUser] = await Promise.all([
    getLatestMessages(),
    getMonthlyThanksCount(),
    getSessionUser(),
  ]);

  const submitUrl = `${getSiteUrl().replace(/\/$/, "")}/gonder`;

  return (
    <main className="kiosk-screen grid h-screen w-screen grid-cols-[clamp(250px,17vw,340px)_minmax(0,1fr)] bg-page">
      <Sidebar
        submitUrl={submitUrl}
        adminHref={isAdminRole(sessionUser?.role) ? "/admin" : null}
      />
      <AppreciationWall
        initialMessages={initialMessages}
        initialMonthlyCount={initialMonthlyCount}
      />
    </main>
  );
}
