import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

import { SLIDE_TYPES, type CultureSlide, type SlideType } from "./model";

export const CULTURE_IMAGE_BUCKET = "culture-images";

export const SLIDE_COLUMNS = `
  id, type, eyebrow, title, body, bullets, event_at, location, image_path,
  person_employee_id, person_role, starts_at, ends_at, sort_order, status,
  person:employees!person_employee_id ( name, avatar_url )
`;

type Person = { name: string; avatar_url: string | null };

export type SlideRow = {
  id: string;
  type: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[] | null;
  event_at: string | null;
  location: string | null;
  image_path: string | null;
  person_employee_id: string | null;
  person_role: string | null;
  starts_at: string;
  ends_at: string;
  sort_order: number;
  status: "draft" | "published";
  person: Person | Person[] | null;
};

export function imagePublicUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${CULTURE_IMAGE_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function mapSlideRow(row: SlideRow, supabaseUrl: string): CultureSlide & {
  image_path: string | null;
  person_employee_id: string | null;
} {
  const person = Array.isArray(row.person) ? (row.person[0] ?? null) : row.person;
  const type = (SLIDE_TYPES as readonly string[]).includes(row.type)
    ? (row.type as SlideType)
    : "duyuru";

  return {
    id: row.id,
    type,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    bullets: row.bullets ?? [],
    event_at: row.event_at,
    location: row.location,
    image_path: row.image_path,
    image_url: imagePublicUrl(supabaseUrl, row.image_path),
    person_employee_id: row.person_employee_id,
    person,
    person_role: row.person_role,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    sort_order: row.sort_order,
    status: row.status,
  };
}

/** Pano ve tarayıcı yenilemesi için: yalnız yayına alınmış içerikler (tarih süzgeci istemcide). */
export async function fetchPublishedSlides(
  supabase: SupabaseClient<Database>,
  supabaseUrl: string,
): Promise<CultureSlide[] | null> {
  const { data, error } = await supabase
    .from("culture_slides")
    .select(SLIDE_COLUMNS)
    .eq("status", "published")
    // Süresi dolanlar yayında kalsa da okunmaz; sınır yeni içerikleri dışarıda bırakmasın.
    .gt("ends_at", new Date().toISOString())
    .order("sort_order", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[culture_slides] okunamadı:", error.message);
    return null;
  }

  return (data as unknown as SlideRow[]).map((row) => mapSlideRow(row, supabaseUrl));
}
