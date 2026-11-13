"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteCultureSlide,
  moveCultureSlide,
  saveCultureSlide,
  setCultureSlideStatus,
} from "@/app/admin/kultur/actions";
import { ImageField } from "@/components/culture-admin/ImageField";
import { SlideView, type SlideFit } from "@/components/culture/SlideView";
import { EmployeePicker } from "@/components/form/EmployeePicker";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PUBLISH_DAYS,
  DERIVED_STATUS_LABELS,
  deriveStatus,
  SLIDE_LIMITS,
  SLIDE_TYPE_LABELS,
  SLIDE_TYPES,
  visibleLength,
  type CultureSlide,
  type DerivedStatus,
  type SlideType,
} from "@/lib/culture/model";
import type { EmployeePublic } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AdminSlide = CultureSlide & { image_path: string | null; person_employee_id: string | null };

type Draft = {
  id?: string;
  type: SlideType;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  event_at: string;
  location: string;
  image_path: string | null;
  image_url: string | null;
  person_employee_id: string;
  person_role: string;
  starts_at: string;
  ends_at: string;
};

const STATUS_STYLE: Record<DerivedStatus, string> = {
  taslak: "bg-slate-100 text-slate-700",
  planlandi: "bg-sky-100 text-sky-800",
  yayinda: "bg-emerald-100 text-emerald-800",
  suresi_doldu: "bg-amber-100 text-amber-800",
};

const TYPE_HINTS: Record<SlideType, string> = {
  duyuru: "Genel bir bilgilendirme.",
  etkinlik: "Tarih, saat ve yeri olan bir buluşma.",
  yeni_katilan: "Aramıza katılan çalışanı tanıt; fotoğraf dizinden gelir.",
  ik: "İzin, yan hak, süreç gibi İK duyuruları.",
  politika: "Yürürlüğe giren bir şirket politikası.",
  haber: "Şirketten bir gelişme ya da başarı.",
};

/** <input type="datetime-local"> tarayıcının saat diliminde çalışır (ofis: İstanbul). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function emptyDraft(): Draft {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + DEFAULT_PUBLISH_DAYS * 86_400_000);
  end.setHours(23, 59, 0, 0);

  return {
    type: "duyuru",
    eyebrow: "",
    title: "",
    body: "",
    bullets: [],
    event_at: "",
    location: "",
    image_path: null,
    image_url: null,
    person_employee_id: "",
    person_role: "",
    starts_at: toLocalInput(start.toISOString()),
    ends_at: toLocalInput(end.toISOString()),
  };
}

function draftFrom(slide: AdminSlide): Draft {
  return {
    id: slide.id,
    type: slide.type,
    eyebrow: slide.eyebrow,
    title: slide.title,
    body: slide.body,
    bullets: slide.bullets,
    event_at: toLocalInput(slide.event_at),
    location: slide.location ?? "",
    image_path: slide.image_path,
    image_url: slide.image_url,
    person_employee_id: slide.person_employee_id ?? "",
    person_role: slide.person_role ?? "",
    starts_at: toLocalInput(slide.starts_at),
    ends_at: toLocalInput(slide.ends_at),
  };
}

function Counter({ value, limit }: { value: string; limit: number }) {
  const length = visibleLength(value);
  return (
    <span className={cn("tabular-nums", length > limit ? "font-bold text-rose-700" : "text-slate-400")}>
      {length} / {limit}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  aside,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  aside?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={htmlFor} className="font-semibold text-slate-800">
          {label}
        </label>
        {aside ? <span className="text-xs">{aside}</span> : null}
      </div>
      {children}
      {error ? <p className="mt-1 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-brand-200 bg-white px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export function CultureAdmin({
  slides,
  employees,
}: {
  slides: AdminSlide[];
  employees: EmployeePublic[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [fit, setFit] = useState<SlideFit | null>(null);
  const [isPending, startTransition] = useTransition();
  // Durum etiketleri liste her yenilendiğinde o anki saate göre hesaplanır.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- liste değişince saat bilerek yenilenir
  const now = useMemo(() => new Date(), [slides]);

  const ordered = useMemo(() => [...slides].sort((a, b) => a.sort_order - b.sort_order), [slides]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const previewSlide: CultureSlide | null = useMemo(() => {
    if (!draft) return null;
    const person =
      draft.type === "yeni_katilan"
        ? employees.find((employee) => employee.id === draft.person_employee_id) ?? null
        : null;
    return {
      id: draft.id ?? "onizleme",
      type: draft.type,
      eyebrow: draft.eyebrow,
      title: draft.title || "Başlık burada görünecek",
      body: draft.body,
      bullets: draft.bullets.filter((bullet) => bullet.trim()),
      event_at: draft.type === "etkinlik" ? fromLocalInput(draft.event_at) : null,
      location: draft.type === "etkinlik" ? draft.location || null : null,
      image_url: draft.type === "yeni_katilan" ? null : draft.image_url,
      person: person ? { name: person.name, avatar_url: person.avatar_url } : null,
      person_role: draft.person_role || null,
      starts_at: fromLocalInput(draft.starts_at) ?? now.toISOString(),
      ends_at: fromLocalInput(draft.ends_at) ?? now.toISOString(),
      sort_order: 0,
      status: "draft",
    };
  }, [draft, employees, now]);

  const handleFit = (next: SlideFit) =>
    setFit((current) =>
      current &&
      current.scale === next.scale &&
      current.overflow === next.overflow &&
      current.titleLines === next.titleLines
        ? current
        : next,
    );

  const save = (status: "draft" | "published") => {
    if (!draft) return;
    setMessage(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await saveCultureSlide({
        id: draft.id,
        type: draft.type,
        eyebrow: draft.eyebrow,
        title: draft.title,
        body: draft.body,
        bullets: draft.bullets,
        event_at: draft.type === "etkinlik" ? fromLocalInput(draft.event_at) : null,
        location: draft.location,
        image_path: draft.image_path,
        person_employee_id: draft.type === "yeni_katilan" ? draft.person_employee_id || null : null,
        person_role: draft.person_role,
        starts_at: fromLocalInput(draft.starts_at) ?? "",
        ends_at: fromLocalInput(draft.ends_at) ?? "",
        status,
      });

      if (result.status === "error") {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      setDraft(null);
      setMessage(status === "published" ? "İçerik yayına alındı." : "Taslak kaydedildi.");
      router.refresh();
    });
  };

  const run = (action: () => Promise<{ status: string; message?: string }>, done?: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.status === "error" ? (result.message ?? "İşlem yapılamadı.") : (done ?? null));
      router.refresh();
    });
  };

  const fitWarnings: string[] = [];
  if (fit?.overflow) fitWarnings.push("İçerik ekrana sığmıyor. Metni ya da maddeleri kısalt.");
  else if (fit && fit.scale < 1) fitWarnings.push("Metin ekrana sığması için biraz küçültüldü.");
  if (fit && fit.titleLines > 3) fitWarnings.push(`Başlık ${fit.titleLines} satıra yayılıyor, kısaltmak daha okunaklı olur.`);

  return (
    <main className="min-h-screen bg-page px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-brand-700">
              ← Yönetim paneli
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold text-brand-950">Kültür Ekranı İçerikleri</h1>
            <p className="mt-1 text-sm text-slate-500">
              Yayındaki içerikler ekranda sırayla döner. Tasarımı sistem yapar; sen yalnız içeriği gir.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex h-11 items-center rounded-xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800"
            >
              Ekranı aç
            </Link>
            <Button
              type="button"
              onClick={() => {
                setDraft(emptyDraft());
                setFieldErrors({});
                setMessage(null);
                setFit(null);
              }}
            >
              <Plus className="size-4" />
              Yeni içerik
            </Button>
          </div>
        </header>

        {message ? (
          <p role="status" className="mt-4 rounded-xl bg-white p-3 text-sm font-medium text-brand-950 shadow-sm">
            {message}
          </p>
        ) : null}

        <div className={cn("mt-6 grid gap-6", draft ? "xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]" : "")}>
          {draft ? (
            <form
              className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                save("published");
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-brand-950">
                  {draft.id ? "İçeriği düzenle" : "Yeni içerik"}
                </h2>
                <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                  Vazgeç
                </Button>
              </div>

              <Field label="İçerik türü" error={fieldErrors.type}>
                <div className="flex flex-wrap gap-2">
                  {SLIDE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={draft.type === type}
                      onClick={() => set("type", type)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-semibold",
                        draft.type === type
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-brand-200 bg-white text-brand-800 hover:bg-brand-50",
                      )}
                    >
                      {SLIDE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{TYPE_HINTS[draft.type]}</p>
              </Field>

              {draft.type === "yeni_katilan" ? (
                <>
                  <Field label="Aramıza katılan çalışan" error={fieldErrors.person_employee_id}>
                    <EmployeePicker
                      employees={employees}
                      value={draft.person_employee_id}
                      onChange={(id) => set("person_employee_id", id)}
                      invalid={Boolean(fieldErrors.person_employee_id)}
                    />
                  </Field>
                  <Field
                    label="Unvan ve ekip"
                    htmlFor="slide-role"
                    aside={<Counter value={draft.person_role} limit={SLIDE_LIMITS.personRole} />}
                    error={fieldErrors.person_role}
                  >
                    <input
                      id="slide-role"
                      className={inputClass}
                      value={draft.person_role}
                      maxLength={SLIDE_LIMITS.personRole}
                      placeholder="Örn. Müşteri Başarı Uzmanı"
                      onChange={(event) => set("person_role", event.target.value)}
                    />
                  </Field>
                </>
              ) : null}

              <Field
                label="Üst başlık (isteğe bağlı)"
                htmlFor="slide-eyebrow"
                aside={<Counter value={draft.eyebrow} limit={SLIDE_LIMITS.eyebrow} />}
                error={fieldErrors.eyebrow}
              >
                <input
                  id="slide-eyebrow"
                  className={inputClass}
                  value={draft.eyebrow}
                  maxLength={SLIDE_LIMITS.eyebrow}
                  placeholder="Örn. Ortak akıl, güçlü bağlar"
                  onChange={(event) => set("eyebrow", event.target.value)}
                />
              </Field>

              <Field
                label="Başlık"
                htmlFor="slide-title"
                aside={<Counter value={draft.title} limit={SLIDE_LIMITS.title} />}
                error={fieldErrors.title}
              >
                <input
                  id="slide-title"
                  className={inputClass}
                  value={draft.title}
                  placeholder="Örn. Açık Kapı: Liderlerle Kahve"
                  onChange={(event) => set("title", event.target.value)}
                />
              </Field>

              <Field
                label="Kısa metin"
                htmlFor="slide-body"
                aside={<Counter value={draft.body} limit={SLIDE_LIMITS.body} />}
                error={fieldErrors.body}
              >
                <textarea
                  id="slide-body"
                  rows={3}
                  className={inputClass}
                  value={draft.body}
                  placeholder="Bir iki cümleyle anlat."
                  onChange={(event) => set("body", event.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Bir kelimeyi vurgulamak için iki yıldız arasına yaz: **saat 15.00**
                </p>
              </Field>

              <Field label={`Maddeler (en fazla ${SLIDE_LIMITS.bullets}, isteğe bağlı)`} error={fieldErrors.bullets}>
                <div className="space-y-2">
                  {draft.bullets.map((bullet, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        aria-label={`Madde ${index + 1}`}
                        className={inputClass}
                        value={bullet}
                        onChange={(event) =>
                          set(
                            "bullets",
                            draft.bullets.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Madde ${index + 1} sil`}
                        onClick={() => set("bullets", draft.bullets.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {draft.bullets.length < SLIDE_LIMITS.bullets ? (
                    <Button type="button" variant="outline" onClick={() => set("bullets", [...draft.bullets, ""])}>
                      <Plus className="size-4" />
                      Madde ekle
                    </Button>
                  ) : null}
                </div>
              </Field>

              {draft.type === "etkinlik" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tarih ve saat" htmlFor="slide-event" error={fieldErrors.event_at}>
                    <input
                      id="slide-event"
                      type="datetime-local"
                      className={inputClass}
                      value={draft.event_at}
                      onChange={(event) => set("event_at", event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Yer"
                    htmlFor="slide-location"
                    aside={<Counter value={draft.location} limit={SLIDE_LIMITS.location} />}
                    error={fieldErrors.location}
                  >
                    <input
                      id="slide-location"
                      className={inputClass}
                      value={draft.location}
                      maxLength={SLIDE_LIMITS.location}
                      placeholder="Örn. Stüdyo Alanı"
                      onChange={(event) => set("location", event.target.value)}
                    />
                  </Field>
                </div>
              ) : null}

              {draft.type !== "yeni_katilan" ? (
                <Field label="Görsel (isteğe bağlı)">
                  <ImageField
                    path={draft.image_path}
                    url={draft.image_url}
                    onChange={(next) =>
                      setDraft((current) =>
                        current ? { ...current, image_path: next.path, image_url: next.url } : current,
                      )
                    }
                  />
                </Field>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Yayın başlangıcı" htmlFor="slide-start" error={fieldErrors.starts_at}>
                  <input
                    id="slide-start"
                    type="datetime-local"
                    className={inputClass}
                    value={draft.starts_at}
                    onChange={(event) => set("starts_at", event.target.value)}
                  />
                </Field>
                <Field label="Yayın bitişi" htmlFor="slide-end" error={fieldErrors.ends_at}>
                  <input
                    id="slide-end"
                    type="datetime-local"
                    className={inputClass}
                    value={draft.ends_at}
                    onChange={(event) => set("ends_at", event.target.value)}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-brand-100 pt-4">
                <Button type="button" variant="outline" disabled={isPending} onClick={() => save("draft")}>
                  Taslak kaydet
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Kaydediliyor..." : "Yayınla"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="space-y-6">
            {previewSlide ? (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">
                  Canlı önizleme · TV&apos;de böyle görünecek
                </h2>
                <div className="mt-3 aspect-[1388/808] w-full overflow-hidden rounded-xl">
                  <SlideView slide={previewSlide} onFit={handleFit} />
                </div>
                {fitWarnings.length ? (
                  <ul className="mt-3 space-y-1 text-sm font-medium text-amber-700">
                    {fitWarnings.map((warning) => (
                      <li key={warning}>⚠ {warning}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm font-medium text-emerald-700">✓ İçerik ekrana rahatça sığıyor.</p>
                )}
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <h2 className="border-b border-brand-100 px-5 py-4 font-extrabold text-brand-950">
                İçerikler <span className="font-semibold text-slate-400">({ordered.length})</span>
              </h2>
              {ordered.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">
                  Henüz içerik yok. “Yeni içerik” ile ilk duyuruyu ekle.
                </p>
              ) : (
                <ol>
                  {ordered.map((slide, index) => {
                    const status = deriveStatus(slide, now);
                    return (
                      <li
                        key={slide.id}
                        className="flex flex-wrap items-center gap-3 border-b border-brand-50 px-5 py-3 last:border-0"
                      >
                        <div className="flex flex-col">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 px-1"
                            aria-label="Yukarı taşı"
                            disabled={isPending || index === 0}
                            onClick={() => run(() => moveCultureSlide(slide.id, "up"))}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 px-1"
                            aria-label="Aşağı taşı"
                            disabled={isPending || index === ordered.length - 1}
                            onClick={() => run(() => moveCultureSlide(slide.id, "down"))}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-brand-950">{slide.title.replace(/\*\*/g, "")}</p>
                          <p className="text-xs text-slate-500">
                            {SLIDE_TYPE_LABELS[slide.type]} ·{" "}
                            {new Date(slide.starts_at).toLocaleDateString("tr-TR")} →{" "}
                            {new Date(slide.ends_at).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_STYLE[status])}>
                          {DERIVED_STATUS_LABELS[status]}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {slide.status === "draft" ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 px-3"
                              disabled={isPending}
                              onClick={() => run(() => setCultureSlideStatus(slide.id, "published"), "İçerik yayına alındı.")}
                            >
                              Yayınla
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 px-3"
                              disabled={isPending}
                              onClick={() => run(() => setCultureSlideStatus(slide.id, "draft"), "İçerik yayından kaldırıldı.")}
                            >
                              Yayından kaldır
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Düzenle"
                            onClick={() => {
                              setDraft(draftFrom(slide));
                              setFieldErrors({});
                              setMessage(null);
                              setFit(null);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {confirmDelete === slide.id ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 border-rose-200 px-3 text-rose-700 hover:bg-rose-50"
                              disabled={isPending}
                              onClick={() => {
                                setConfirmDelete(null);
                                run(() => deleteCultureSlide(slide.id), "İçerik silindi.");
                              }}
                            >
                              Kalıcı olarak sil
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Sil"
                              onClick={() => setConfirmDelete(slide.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
