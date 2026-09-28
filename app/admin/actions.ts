"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/session";

export type AdminActionResult =
  | { status: "success" }
  | { status: "error"; message: string };

async function recordAction(
  recognitionId: string,
  adminUserId: string,
  action: "REMOVE" | "RESTORE" | "PUBLISH",
  reason: string | null,
) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  await admin.from("recognition_admin_actions").insert({
    recognition_id: recognitionId,
    admin_user_id: adminUserId,
    action,
    reason,
  });
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<AdminActionResult> {
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { status: "error", message: "E-posta veya şifre hatalı." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Oturum açılamadı." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "administrative_affairs_manager") {
    await supabase.auth.signOut();
    return { status: "error", message: "Bu hesap yönetim paneline erişemez." };
  }

  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/giris");
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const nextPassword = newPassword.trim();

  if (nextPassword.length < 8) {
    return { status: "error", message: "Yeni şifre en az 8 karakter olmalı." };
  }

  if (nextPassword === currentPassword) {
    return { status: "error", message: "Yeni şifre mevcut şifreden farklı olmalı." };
  }

  const supabase = await createSessionClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { status: "error", message: "Mevcut şifre hatalı." };
  }

  const { error } = await supabase.auth.updateUser({ password: nextPassword });

  if (error) {
    return { status: "error", message: "Şifre güncellenemedi. Lütfen tekrar deneyin." };
  }

  return { status: "success" };
}

export async function removeFromWall(
  recognitionId: string,
  reason: string,
): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { status: "error", message: "Yönetici veritabanı bağlantısı yok." };
  }

  const trimmedReason = reason.trim();
  const { data, error } = await admin
    .from("thanks_messages")
    .update({
      status: "removed",
      removed_at: new Date().toISOString(),
      removed_by: user.id,
      remove_reason: trimmedReason || null,
    })
    .eq("id", recognitionId)
    .eq("status", "approved")
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "Mesaj yayından kaldırılamadı." };
  }

  await recordAction(recognitionId, user.id, "REMOVE", trimmedReason || null);
  revalidatePath("/admin");
  revalidatePath("/");

  return { status: "success" };
}

export async function publishModerationError(
  recognitionId: string,
): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { status: "error", message: "Yönetici veritabanı bağlantısı yok." };
  }

  const publishedAt = new Date().toISOString();
  const reason = "Moderasyon hatası sonrası yönetici yayına aldı.";
  const { data, error } = await admin
    .from("thanks_messages")
    .update({
      status: "approved",
      moderation_decision: "APPROVE",
      moderation_reason: reason,
      published_at: publishedAt,
      moderated_at: publishedAt,
    })
    .eq("id", recognitionId)
    .eq("status", "moderation_error")
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "Mesaj yayına alınamadı." };
  }

  await recordAction(recognitionId, user.id, "PUBLISH", reason);
  revalidatePath("/admin");
  revalidatePath("/");

  return { status: "success" };
}

export async function restoreToWall(
  recognitionId: string,
): Promise<AdminActionResult> {
  const user = await requireAdmin();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { status: "error", message: "Yönetici veritabanı bağlantısı yok." };
  }

  const { data, error } = await admin
    .from("thanks_messages")
    .update({
      status: "approved",
      published_at: new Date().toISOString(),
    })
    .eq("id", recognitionId)
    .eq("status", "removed")
    .select("id");

  if (error || !data?.length) {
    return { status: "error", message: "Mesaj yeniden yayınlanamadı." };
  }

  await recordAction(recognitionId, user.id, "RESTORE", null);
  revalidatePath("/admin");
  revalidatePath("/");

  return { status: "success" };
}
