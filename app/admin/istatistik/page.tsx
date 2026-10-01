import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/wall/Avatar";
import {
  currentMonth,
  getMonthlyStats,
  isValidMonth,
  type RankedRow,
} from "@/lib/admin-stats";
import { requireAdmin } from "@/lib/auth";
import { toDativeCase } from "@/lib/turkish";

export const metadata: Metadata = { title: "Aylık İstatistikler | Teşekkür Panosu" };

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return `${MONTH_NAMES[index - 1]} ${year}`;
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-950 tabular-nums">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-extrabold text-brand-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-slate-500">Bu ay için veri yok.</p>;
}

/** Tek ölçü, tek renk: uzunluk değeri taşır, sayı her zaman yanında yazar. */
function BarList({ rows, withAvatar = false }: { rows: RankedRow[]; withAvatar?: boolean }) {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(...rows.map((row) => row.value));

  return (
    <ol className="space-y-2.5">
      {rows.map((row, index) => (
        <li
          key={`${row.label}-${index}`}
          className="group grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-3 rounded-lg px-1 py-0.5 hover:bg-violet-50"
          title={`${row.label}: ${row.value}`}
        >
          <span className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
            {withAvatar ? (
              <Avatar name={row.label} avatarUrl={row.avatarUrl ?? null} className="size-7 text-[10px]" />
            ) : null}
            <span className="truncate">{row.label}</span>
          </span>
          <span className="h-3 rounded-r bg-violet-100">
            <span
              className="block h-full rounded-r bg-violet-600 group-hover:bg-violet-700"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="text-right text-sm font-bold text-brand-950 tabular-nums">
            {row.value}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DailyChart({ daily }: { daily: { day: number; value: number }[] }) {
  const max = Math.max(1, ...daily.map((item) => item.value));
  const peak = daily.reduce((best, item) => (item.value > best.value ? item : best), daily[0]);

  if (daily.every((item) => item.value === 0)) return <Empty />;

  return (
    <figure>
      <div className="flex h-40 items-end gap-[2px] border-b border-slate-200">
        {daily.map((item) => (
          <div
            key={item.day}
            className="group relative flex h-full flex-1 items-end"
            title={`${item.day}. gün: ${item.value} teşekkür`}
          >
            <div
              className="w-full rounded-t bg-violet-600 group-hover:bg-violet-700"
              style={{ height: item.value ? `${(item.value / max) * 100}%` : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400 tabular-nums">
        <span>1</span>
        <span>{Math.ceil(daily.length / 2)}</span>
        <span>{daily.length}</span>
      </div>
      <figcaption className="mt-2 text-xs text-slate-500">
        En yoğun gün: {peak.day}. gün, {peak.value} teşekkür
      </figcaption>
    </figure>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const month = isValidMonth(params.ay) ? params.ay : currentMonth();
  const stats = await getMonthlyStats(month);
  const isCurrent = month === currentMonth();

  return (
    <main className="min-h-screen bg-[#F5F2FB] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-violet-700">
              ← Yönetim paneli
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold text-brand-950">Aylık İstatistikler</h1>
          </div>
          <nav className="flex items-center gap-2" aria-label="Ay seçimi">
            <Link
              href={`/admin/istatistik?ay=${shiftMonth(month, -1)}`}
              className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-800 shadow-sm"
            >
              ← Önceki
            </Link>
            <span className="min-w-32 text-center font-bold text-brand-950">{monthLabel(month)}</span>
            {isCurrent ? (
              <span className="rounded-xl px-3 py-2 text-sm text-slate-300">Sonraki →</span>
            ) : (
              <Link
                href={`/admin/istatistik?ay=${shiftMonth(month, 1)}`}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-violet-800 shadow-sm"
              >
                Sonraki →
              </Link>
            )}
          </nav>
        </header>

        {!stats ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            İstatistikler okunamadı.
          </p>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatTile label="Yayınlanan teşekkür" value={stats.published} />
              <StatTile label="Gönderilen toplam" value={stats.submitted} />
              <StatTile label="Teşekkür alan kişi" value={stats.recipients} />
              <StatTile label="Teşekkür eden kişi" value={stats.senders} />
              <StatTile label="Toplam tepki" value={stats.reactions} />
            </section>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Panel title="En çok teşekkür alanlar">
                <BarList rows={stats.topRecipients} withAvatar />
              </Panel>
              <div className="grid gap-4">
                <Panel title="Kategoriler">
                  <BarList rows={stats.categories.map((row) => ({ ...row, label: `#${row.label}` }))} />
                </Panel>
                <Panel title="En çok teşekkür edenler">
                  <BarList rows={stats.topSenders} />
                </Panel>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Panel title="Günlere göre yayınlanan teşekkürler">
                <DailyChart daily={stats.daily} />
              </Panel>
              <Panel title="Moderasyonu yapan">
                <BarList rows={stats.providers} />
              </Panel>
            </div>

            <div className="mt-4">
              <Panel title="En çok tepki alan mesajlar">
                {stats.topReacted.length === 0 ? (
                  <Empty />
                ) : (
                  <ol className="grid gap-3 md:grid-cols-3">
                    {stats.topReacted.map((row) => (
                      <li key={row.id} className="rounded-xl bg-violet-50 p-4">
                        <p className="font-extrabold text-brand-950">{toDativeCase(row.recipient)}</p>
                        <p className="mt-1 text-sm text-ink">{row.message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {row.sender} · {row.total} tepki
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
