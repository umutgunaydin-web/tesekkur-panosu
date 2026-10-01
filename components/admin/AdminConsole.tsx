"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  changeAdminPassword,
  deleteRejectedMessage,
  publishModerationError,
  publishRejected,
  removeFromWall,
  restoreToWall,
  retryModeration,
} from "@/app/admin/actions";
import { Avatar } from "@/components/wall/Avatar";
import { Button } from "@/components/ui/button";
import { ADMIN_PAGE_SIZE, type AdminRecognition } from "@/lib/admin-shared";
import type { ModerationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "approved", label: "Yayında" },
  { id: "pending", label: "Bekliyor" },
  { id: "rejected", label: "Reddedildi" },
  { id: "removed", label: "Kaldırıldı" },
  { id: "moderation_error", label: "Moderasyon Hatası" },
];

const STATUS_LABEL: Record<ModerationStatus, string> = {
  approved: "Yayında",
  pending: "Bekliyor",
  rejected: "Reddedildi",
  removed: "Kaldırıldı",
  moderation_error: "Moderasyon Hatası",
};

const STATUS_CLASS: Record<ModerationStatus, string> = {
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-rose-100 text-rose-800",
  removed: "bg-slate-200 text-slate-700",
  moderation_error: "bg-orange-100 text-orange-800",
};

type Counts = Record<
  "approved" | "pending" | "rejected" | "removed" | "moderation_error",
  number
>;

type AdminConsoleProps = {
  userEmail: string;
  rows: AdminRecognition[];
  count: number;
  page: number;
  status: string;
  query: string;
  counts: Counts;
  signOut: () => Promise<void>;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminConsole({
  userEmail,
  rows,
  count,
  page,
  status,
  query,
  counts,
  signOut,
}: AdminConsoleProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminRecognition | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminRecognition | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminRecognition | null>(null);
  const [publishTarget, setPublishTarget] = useState<AdminRecognition | null>(null);
  const [rejectedPublishTarget, setRejectedPublishTarget] =
    useState<AdminRecognition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRecognition | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE));

  const href = (next: { status?: string; page?: number; q?: string }) => {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextQuery = next.q ?? query;
    const nextPage = next.page ?? 1;
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextQuery) params.set("q", nextQuery);
    if (nextPage > 1) params.set("page", String(nextPage));
    const search = params.toString();
    return search ? `/admin?${search}` : "/admin";
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await removeFromWall(removeTarget.id, reason);
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }
      setRemoveTarget(null);
      setReason("");
      setSelected(null);
      router.refresh();
    });
  };

  const confirmPublish = () => {
    if (!publishTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await publishModerationError(publishTarget.id);
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }
      setPublishTarget(null);
      setSelected(null);
      router.refresh();
    });
  };

  const retry = (row: AdminRecognition) => {
    setActionError(null);
    setRetryingId(row.id);
    startTransition(async () => {
      const result = await retryModeration(row.id);
      setRetryingId(null);
      if (result.status === "error") setActionError(result.message);
      router.refresh();
    });
  };

  const confirmRejectedPublish = () => {
    if (!rejectedPublishTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await publishRejected(rejectedPublishTarget.id);
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }
      setRejectedPublishTarget(null);
      setSelected(null);
      router.refresh();
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await deleteRejectedMessage(deleteTarget.id);
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }
      setDeleteTarget(null);
      setSelected(null);
      router.refresh();
    });
  };

  const confirmRestore = () => {
    if (!restoreTarget) return;
    setActionError(null);
    startTransition(async () => {
      const result = await restoreToWall(restoreTarget.id);
      if (result.status === "error") {
        setActionError(result.message);
        return;
      }
      setRestoreTarget(null);
      setSelected(null);
      router.refresh();
    });
  };

  return (
    <main className="min-h-screen bg-[#F5F2FB] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-brand-950">
              Teşekkür Panosu Yönetimi
            </h1>
            <p className="mt-1 text-sm text-slate-500">{userEmail}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/istatistik"
              className="inline-flex h-10 items-center rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white"
            >
              Aylık istatistikler
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPasswordOpen(true);
                setPasswordError(null);
                setPasswordSaved(false);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Şifre değiştir
            </Button>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Çıkış yap
              </Button>
            </form>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["approved", "Yayında"],
              ["pending", "Bekliyor"],
              ["rejected", "Reddedildi"],
              ["removed", "Kaldırıldı"],
              ["moderation_error", "Moderasyon Hatası"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={href({ status: key })}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-950">
                {counts[key]}
              </p>
            </Link>
          ))}
        </section>

        <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/admin">
          <input
            name="q"
            defaultValue={query}
            placeholder="Ara..."
            className="h-11 flex-1 rounded-xl border border-violet-200 bg-white px-4 text-sm"
          />
          {status !== "all" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id}
              href={href({ status: filter.id, q: query })}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold",
                status === filter.id
                  ? "bg-violet-700 text-white"
                  : "bg-white text-violet-800",
              )}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        {actionError ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </p>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="border-b text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Alıcı</th>
                <th className="px-4 py-3">Gönderen</th>
                <th className="px-4 py-3">Mesaj</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Moderasyon Nedeni</th>
                <th className="px-4 py-3">Güven Skoru</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Bu filtrede kayıt yok.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() => setSelected(row)}
                      >
                        <Avatar
                          name={row.recipient?.name ?? row.receiver}
                          avatarUrl={row.recipient?.avatar_url}
                          className="size-9 text-xs"
                        />
                        <span className="font-semibold text-slate-900">
                          {row.recipient?.name ?? row.receiver}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.sender}</td>
                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      <p className="line-clamp-2">{row.message}</p>
                    </td>
                    <td className="px-4 py-3">{row.category_tag}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          STATUS_CLASS[row.status],
                        )}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                      {row.moderation_decision ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {row.moderation_decision}
                        </p>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-slate-600">
                      <p className="line-clamp-2">{row.moderation_reason ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.moderation_confidence === null
                        ? "—"
                        : row.moderation_confidence.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "approved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setReason("");
                            setRemoveTarget(row);
                          }}
                        >
                          Yayından Kaldır
                        </Button>
                      ) : null}
                      {row.status === "removed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setRestoreTarget(row)}
                        >
                          Tekrar Yayınla
                        </Button>
                      ) : null}
                      {row.status === "moderation_error" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => retry(row)}
                          >
                            {retryingId === row.id ? "Deneniyor…" : "Tekrar Dene"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPublishTarget(row)}
                          >
                            Yayına Al
                          </Button>
                        </div>
                      ) : null}
                      {row.status === "rejected" ? (
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setRejectedPublishTarget(row)}
                          >
                            Yayına Al
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => setDeleteTarget(row)}
                          >
                            Kalıcı Sil
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Sayfa {page} / {pageCount}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={href({ page: page - 1 })} className="rounded-xl bg-white px-3 py-2">
                  Önceki
                </Link>
              ) : null}
              {page < pageCount ? (
                <Link href={href({ page: page + 1 })} className="rounded-xl bg-white px-3 py-2">
                  Sonraki
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/30">
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold text-brand-950">Mesaj</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-500">
                Kapat
              </button>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <Avatar
                name={selected.recipient?.name ?? selected.receiver}
                avatarUrl={selected.recipient?.avatar_url}
                className="size-12"
              />
              <div>
                <p className="text-xs text-slate-500">Alıcı</p>
                <p className="font-bold">{selected.recipient?.name ?? selected.receiver}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Gönderen</dt>
                <dd className="font-medium">{selected.sender}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Kategori</dt>
                <dd>{selected.category_tag}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Tarih</dt>
                <dd>{formatDate(selected.created_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Durum</dt>
                <dd>{STATUS_LABEL[selected.status]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mesaj</dt>
                <dd className="mt-1 whitespace-pre-wrap">{selected.message}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Moderasyon kararı</dt>
                <dd>{selected.moderation_decision ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Moderasyon Nedeni</dt>
                <dd>{selected.moderation_reason ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Güven Skoru</dt>
                <dd>
                  {selected.moderation_confidence === null
                    ? "—"
                    : selected.moderation_confidence.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Moderasyon zamanı</dt>
                <dd>{formatDate(selected.moderated_at)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Yayın zamanı</dt>
                <dd>{formatDate(selected.published_at)}</dd>
              </div>
              {selected.removed_at ? (
                <>
                  <div>
                    <dt className="text-slate-500">Kaldırılma zamanı</dt>
                    <dd>{formatDate(selected.removed_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Kaldırma nedeni</dt>
                    <dd>{selected.remove_reason ?? "—"}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </aside>
        </div>
      ) : null}

      {passwordOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              setPasswordError(null);
              setPasswordSaved(false);

              if (newPassword !== confirmPassword) {
                setPasswordError("Yeni şifreler birbiriyle eşleşmiyor.");
                return;
              }

              startTransition(async () => {
                const result = await changeAdminPassword(currentPassword, newPassword);
                if (result.status === "error") {
                  setPasswordError(result.message);
                  return;
                }
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setPasswordSaved(true);
              });
            }}
          >
            <h2 className="text-xl font-extrabold text-brand-950">Şifre değiştir</h2>
            <label className="mt-4 block text-sm font-medium text-slate-600">
              Mevcut şifre
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-violet-200 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Yeni şifre
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={8}
                className="mt-2 h-11 w-full rounded-xl border border-violet-200 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-slate-600">
              Yeni şifre (tekrar)
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                className="mt-2 h-11 w-full rounded-xl border border-violet-200 px-3 text-sm"
              />
            </label>
            {passwordError ? (
              <p className="mt-3 text-sm text-rose-700">{passwordError}</p>
            ) : null}
            {passwordSaved ? (
              <p className="mt-3 text-sm font-medium text-emerald-700">Şifren güncellendi.</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" disabled={isPending}>
                Kaydet
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {publishTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-950">
              Mesaj yayına alınsın mı?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Moderasyon servisi bu kayıt için karar üretemedi. Onaylarsan mesaj
              panoda görünür.
            </p>
            <p className="mt-3 text-sm text-slate-800">{publishTarget.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPublishTarget(null)}>
                Vazgeç
              </Button>
              <Button type="button" disabled={isPending} onClick={confirmPublish}>
                Yayına Al
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectedPublishTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-950">
              Ret yayına alınsın mı?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Bu yalnızca hatalı bir ret içindir. Onaylarsan mesaj panoda görünür.
            </p>
            <p className="mt-3 text-sm text-slate-800">{rejectedPublishTarget.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectedPublishTarget(null)}
              >
                Vazgeç
              </Button>
              <Button type="button" disabled={isPending} onClick={confirmRejectedPublish}>
                Yayına Al
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-950">
              Mesaj kalıcı olarak silinsin mi?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Yalnızca reddedilmiş kayıt silinir. Bu işlem geri alınamaz.
            </p>
            <p className="mt-3 text-sm text-slate-800">{deleteTarget.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                Vazgeç
              </Button>
              <Button
                type="button"
                disabled={isPending}
                className="bg-rose-700 text-white hover:bg-rose-800"
                onClick={confirmDelete}
              >
                Kalıcı Sil
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {restoreTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-950">
              Mesaj tekrar yayınlansın mı?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Kayıt yeniden panoda görünür. Önceki kaldırma bilgisi denetim için durur.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRestoreTarget(null)}>
                Vazgeç
              </Button>
              <Button type="button" disabled={isPending} onClick={confirmRestore}>
                Tekrar Yayınla
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {removeTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-extrabold text-brand-950">
              Mesaj yayından kaldırılsın mı?
            </h2>
            <label className="mt-4 block text-sm font-medium text-slate-600">
              Kaldırma nedeni
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-violet-200 p-3 text-sm"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRemoveTarget(null)}>
                Vazgeç
              </Button>
              <Button type="button" disabled={isPending} onClick={confirmRemove}>
                Yayından Kaldır
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
