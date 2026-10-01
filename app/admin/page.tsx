import { AdminConsole } from "@/components/admin/AdminConsole";
import { signOutAdmin } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import {
  countByStatus,
  listAdminRecognitions,
} from "@/lib/admin-recognitions";

export const dynamic = "force-dynamic";

/** "Tekrar Dene" moderasyonu bu istekte çalıştırır. */
export const maxDuration = 60;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const user = await requireAdmin();
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const [list, counts] = await Promise.all([
    listAdminRecognitions({
      status: params.status,
      q: params.q,
      page: Number.isFinite(page) ? page : 1,
    }),
    countByStatus(),
  ]);

  return (
    <AdminConsole
      userEmail={user.email}
      rows={list.rows}
      count={list.count}
      page={list.page}
      status={params.status ?? "all"}
      query={params.q ?? ""}
      counts={counts}
      signOut={signOutAdmin}
    />
  );
}
