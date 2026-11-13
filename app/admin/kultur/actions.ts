"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { moveInOrder, slideInputSchema, type SlideInput } from "@/lib/culture/model";
import { CULTURE_IMAGE_BUCKET } from "@/lib/culture/query";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type CultureActionResult =
  | { status: "success"; id?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const NO_DB: CultureActionResult = { status: "error", message: "Yönetici veritabanı bağlantısı yok." };

function refresh() {
  revalidatePath("/admin/kultur");
  revalidatePath("/");
}

async function removeImage(path: string | null | undefined) {
  if (!path) return;
  const admin = getSupabaseAdminClient();
  await admin?.storage.from(CULTURE_IMAGE_BUCKET).remove([path]);
}

export async function saveCultureSlide(input: SlideInput): Promise<CultureActionResult> {
  const user = await requireAdmin();
  const admin = getSupabaseAdminClient();
  if (!admin) return NO_DB;

  const parsed = slideInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Formda düzeltilmesi gereken alanlar var.", fieldErrors };
  }

  const { id, ...values } = parsed.data;
  const isNewHire = values.type === "yeni_katilan";
  const row = {
    type: values.type,
    eyebrow: values.eyebrow,
    title: values.title,
    body: values.body,
    bullets: values.bullets,
    event_at: values.type === "etkinlik" ? (values.event_at ?? null) : null,
    location: values.type === "etkinlik" ? (values.location ?? null) : null,
    image_path: isNewHire ? null : (values.image_path ?? null),
    person_employee_id: isNewHire ? (values.person_employee_id ?? null) : null,
    person_role: isNewHire ? (values.person_role ?? null) : null,
    starts_at: values.starts_at,
    ends_at: values.ends_at,
    status: values.status,
    updated_by: user.id,
  };

  if (row.image_path && !/^slides\/[0-9a-f-]{36}\.(jpg|webp)$/.test(row.image_path)) {
    return { status: "error", message: "Görsel yüklemesi geçersiz, görseli yeniden seç." };
  }

  if (id) {
    const { data: previous } = await admin
      .from("culture_slides")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin
      .from("culture_slides")
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { status: "error", message: "İçerik kaydedilemedi." };

    if (previous?.image_path && previous.image_path !== row.image_path) {
      await removeImage(previous.image_path);
    }
    refresh();
    return { status: "success", id };
  }

  const { data: last } = await admin
    .from("culture_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await admin
    .from("culture_slides")
    .insert({ ...row, sort_order: (last?.sort_order ?? -1) + 1, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) return { status: "error", message: "İçerik kaydedilemedi." };
  refresh();
  return { status: "success", id: data.id };
}

export async function setCultureSlideStatus(
  id: string,
  status: "draft" | "published",
): Promise<CultureActionResult> {
  const user = await requireAdmin();
  const admin = getSupabaseAdminClient();
  if (!admin) return NO_DB;

  const { error } = await admin
    .from("culture_slides")
    .update({ status, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { status: "error", message: "Durum değiştirilemedi." };
  refresh();
  return { status: "success", id };
}

export async function moveCultureSlide(id: string, direction: "up" | "down"): Promise<CultureActionResult> {
  await requireAdmin();
  const admin = getSupabaseAdminClient();
  if (!admin) return NO_DB;

  const { data } = await admin.from("culture_slides").select("id, sort_order");
  const changes = moveInOrder(data ?? [], id, direction);
  for (const change of changes) {
    await admin.from("culture_slides").update({ sort_order: change.sort_order }).eq("id", change.id);
  }
  refresh();
  return { status: "success", id };
}

export async function deleteCultureSlide(id: string): Promise<CultureActionResult> {
  await requireAdmin();
  const admin = getSupabaseAdminClient();
  if (!admin) return NO_DB;

  const { data, error } = await admin
    .from("culture_slides")
    .delete()
    .eq("id", id)
    .select("image_path");
  if (error || !data?.length) return { status: "error", message: "İçerik silinemedi." };

  await removeImage(data[0].image_path);
  refresh();
  return { status: "success" };
}

/**
 * Görsel tarayıcıdan doğrudan Storage'a gider (sunucu aksiyonu 1 MB ile
 * sınırlı). Sunucu yalnız tek kullanımlık, yolu kendisinin seçtiği bir
 * yükleme adresi verir; tür ve boyut sınırı bucket'ta uygulanır.
 */
export async function createCultureImageUpload(
  contentType: string,
): Promise<{ status: "success"; path: string; token: string } | { status: "error"; message: string }> {
  await requireAdmin();
  const admin = getSupabaseAdminClient();
  if (!admin) return NO_DB as { status: "error"; message: string };

  const extension = contentType === "image/webp" ? "webp" : contentType === "image/jpeg" ? "jpg" : null;
  if (!extension) return { status: "error", message: "Yalnız JPEG veya WebP görsel yüklenebilir." };

  const path = `slides/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await admin.storage.from(CULTURE_IMAGE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { status: "error", message: "Görsel yükleme başlatılamadı." };

  return { status: "success", path: data.path, token: data.token };
}
