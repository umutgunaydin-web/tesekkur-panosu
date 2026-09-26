import { AppreciationWall } from "@/components/wall/AppreciationWall";
import { Sidebar } from "@/components/wall/Sidebar";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-role";
import { getSiteUrl } from "@/lib/env";
import { getLatestMessages, getMonthlyThanksCount } from "@/lib/messages";

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
    <main className="kiosk-screen grid h-screen w-screen grid-cols-[clamp(250px,17vw,340px)_minmax(0,1fr)] bg-[#F5F2FB]">
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
