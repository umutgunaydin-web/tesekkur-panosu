import { z } from "zod";

/** İK'nın seçtiği içerik türleri. Her tür yalnız kendi alanlarını sorar. */
export const SLIDE_TYPES = [
  "duyuru",
  "etkinlik",
  "yeni_katilan",
  "ik",
  "politika",
  "haber",
] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];

export const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  duyuru: "Duyuru",
  etkinlik: "Etkinlik",
  yeni_katilan: "Aramıza Hoş Geldin",
  ik: "İK Duyurusu",
  politika: "Şirket Politikası",
  haber: "Şirket Haberi",
};

/** Formdaki sayaç, zod şeması ve veritabanı check'leri aynı sayıları kullanır. */
export const SLIDE_LIMITS = {
  title: 60,
  body: 180,
  bullet: 60,
  bullets: 3,
  eyebrow: 40,
  location: 40,
  personRole: 60,
} as const;

/** İK'nın açık sorularına verilen varsayılanlar; değişirse yalnız burası değişir. */
export const SLIDE_DURATION_MS = 25_000;
export const DEFAULT_PUBLISH_DAYS = 7;

export type SlideStatus = "draft" | "published";
export type DerivedStatus = "taslak" | "planlandi" | "yayinda" | "suresi_doldu";

export const DERIVED_STATUS_LABELS: Record<DerivedStatus, string> = {
  taslak: "Taslak",
  planlandi: "Planlandı",
  yayinda: "Yayında",
  suresi_doldu: "Süresi doldu",
};

export type CultureSlide = {
  id: string;
  type: SlideType;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  event_at: string | null;
  location: string | null;
  image_url: string | null;
  person: { name: string; avatar_url: string | null } | null;
  person_role: string | null;
  starts_at: string;
  ends_at: string;
  sort_order: number;
  status: SlideStatus;
};

export function deriveStatus(
  slide: Pick<CultureSlide, "status" | "starts_at" | "ends_at">,
  now: Date,
): DerivedStatus {
  if (slide.status === "draft") return "taslak";
  const time = now.getTime();
  if (time >= new Date(slide.ends_at).getTime()) return "suresi_doldu";
  if (time < new Date(slide.starts_at).getTime()) return "planlandi";
  return "yayinda";
}

/** TV'de o an gösterilecek içerikler, panel sırasına göre. */
export function liveSlides<T extends Pick<CultureSlide, "status" | "starts_at" | "ends_at" | "sort_order">>(
  slides: T[],
  now: Date,
): T[] {
  return slides
    .filter((slide) => deriveStatus(slide, now) === "yayinda")
    .sort((a, b) => a.sort_order - b.sort_order);
}

export type TextSegment = { text: string; bold: boolean };

/**
 * Yalnız **kalın** işaretini tanır. HTML asla üretilmez; metin React ile
 * düz yazı olarak basılır. Kapanmayan işaret düz metin kalır.
 */
export function parseEmphasis(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;

  for (const match of input.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ text: input.slice(cursor, start), bold: false });
    segments.push({ text: match[1], bold: true });
    cursor = start + match[0].length;
  }

  if (cursor < input.length) segments.push({ text: input.slice(cursor), bold: false });
  return segments.filter((segment) => segment.text.length > 0);
}

/** Karakter sınırında görünen uzunluk: kalın işaretleri sayılmaz. */
export function visibleLength(input: string): number {
  return input.replace(/\*\*/g, "").length;
}

const visibleMax = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .refine((value) => visibleLength(value) <= limit, `${label} en fazla ${limit} karakter olabilir.`);

const optionalText = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .max(limit, `${label} en fazla ${limit} karakter olabilir.`)
    .transform((value) => value || null)
    .nullable()
    .optional();

export const slideInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    type: z.enum(SLIDE_TYPES, { errorMap: () => ({ message: "Bir içerik türü seç." }) }),
    eyebrow: z.string().trim().max(SLIDE_LIMITS.eyebrow, `Üst başlık en fazla ${SLIDE_LIMITS.eyebrow} karakter olabilir.`),
    title: visibleMax(SLIDE_LIMITS.title, "Başlık").refine((v) => visibleLength(v) >= 2, "Başlık yaz."),
    body: visibleMax(SLIDE_LIMITS.body, "Metin"),
    bullets: z
      .array(visibleMax(SLIDE_LIMITS.bullet, "Madde"))
      .max(SLIDE_LIMITS.bullets, `En fazla ${SLIDE_LIMITS.bullets} madde eklenebilir.`)
      .transform((items) => items.filter((item) => item.length > 0)),
    event_at: z.string().datetime({ offset: true }).nullable().optional(),
    location: optionalText(SLIDE_LIMITS.location, "Yer"),
    image_path: z.string().max(200).nullable().optional(),
    person_employee_id: z.string().uuid().nullable().optional(),
    person_role: optionalText(SLIDE_LIMITS.personRole, "Unvan"),
    starts_at: z.string().datetime({ offset: true }),
    ends_at: z.string().datetime({ offset: true }),
    status: z.enum(["draft", "published"]),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.ends_at) <= new Date(value.starts_at)) {
      ctx.addIssue({ code: "custom", path: ["ends_at"], message: "Bitiş tarihi başlangıçtan sonra olmalı." });
    }
    if (value.type === "yeni_katilan" && !value.person_employee_id) {
      ctx.addIssue({ code: "custom", path: ["person_employee_id"], message: "Yeni katılan çalışanı listeden seç." });
    }
    if (value.type === "etkinlik" && !value.event_at) {
      ctx.addIssue({ code: "custom", path: ["event_at"], message: "Etkinliğin tarih ve saatini gir." });
    }
  });

export type SlideInput = z.input<typeof slideInputSchema>;
export type SlideValues = z.output<typeof slideInputSchema>;

const EVENT_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

/** "27 Kasım 15:00" → "27 Kasım · 15.00" (ofis TV'sindeki yazım). */
export function formatEventAt(iso: string): string {
  const parts = EVENT_FORMATTER.formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} · ${get("hour")}.${get("minute")}`;
}

/**
 * Yukarı/aşağı taşıma: komşusuyla yer değiştirir ve sıra numaralarını 0..n
 * olarak yeniden yazar. Değişen kayıtları döner.
 */
export function moveInOrder<T extends { id: string; sort_order: number }>(
  items: T[],
  id: string,
  direction: "up" | "down",
): { id: string; sort_order: number }[] {
  const ordered = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const index = ordered.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ordered.length) return [];

  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered
    .map((item, position) => ({ id: item.id, sort_order: position, changed: item.sort_order !== position }))
    .filter((item) => item.changed)
    .map(({ id: itemId, sort_order }) => ({ id: itemId, sort_order }));
}
