import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createClient } from "@supabase/supabase-js";

function readEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const line = readFileSync(".env.local", "utf8")
      .split("\n")
      .find((entry) => entry.startsWith(`${name}=`));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
const skip = !url || !anonKey || !serviceKey;

// 1x1 JPEG; içerik değil, yalnız MIME ve erişim denenir.
const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64",
);

test("kültür içerikleri: anon yalnız yayındakileri ve izinli sütunları okur, yazamaz", { skip }, async () => {
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });

  const listed = await anon.from("culture_slides").select("id, title, status").limit(1);
  assert.equal(listed.error, null);

  const insert = await anon.from("culture_slides").insert({
    type: "duyuru",
    title: "rls testi",
    ends_at: new Date(Date.now() + 3_600_000).toISOString(),
    status: "published",
  });
  assert.ok(insert.error, "anon içerik ekleyememeli");

  const hidden = await anon.from("culture_slides").select("created_by").limit(1);
  assert.ok(hidden.error, "anon created_by sütununu okuyamamalı");

  const draft = await admin
    .from("culture_slides")
    .insert({ type: "duyuru", title: "RLS test taslağı", ends_at: new Date(Date.now() + 3_600_000).toISOString() })
    .select("id")
    .single();
  assert.equal(draft.error, null);

  try {
    const seen = await anon.from("culture_slides").select("id").eq("id", draft.data!.id);
    assert.deepEqual(seen.data, [], "taslak anon'a görünmemeli");

    const badType = await admin
      .from("culture_slides")
      .insert({ type: "reklam", title: "geçersiz", ends_at: new Date(Date.now() + 3_600_000).toISOString() });
    assert.ok(badType.error, "tanımsız tür reddedilmeli");

    const longTitle = await admin
      .from("culture_slides")
      .insert({ type: "duyuru", title: "x".repeat(61), ends_at: new Date(Date.now() + 3_600_000).toISOString() });
    assert.ok(longTitle.error, "60 karakterden uzun başlık reddedilmeli");
  } finally {
    await admin.from("culture_slides").delete().eq("id", draft.data!.id);
  }
});

test("kültür görselleri: imzalı yükleme JPEG kabul eder, PNG reddeder, herkese açık okunur", { skip }, async () => {
  const admin = createClient(url!, serviceKey!, { auth: { persistSession: false } });
  const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
  const bucket = admin.storage.from("culture-images");
  const path = `slides/${crypto.randomUUID()}.jpg`;

  const direct = await anon.storage.from("culture-images").upload(`slides/${crypto.randomUUID()}.jpg`, TINY_JPEG, {
    contentType: "image/jpeg",
  });
  assert.ok(direct.error, "imzasız anon yükleme reddedilmeli");

  const ticket = await bucket.createSignedUploadUrl(path);
  assert.equal(ticket.error, null);

  try {
    const uploaded = await anon.storage
      .from("culture-images")
      .uploadToSignedUrl(ticket.data!.path, ticket.data!.token, TINY_JPEG, { contentType: "image/jpeg" });
    assert.equal(uploaded.error, null);

    const response = await fetch(bucket.getPublicUrl(path).data.publicUrl);
    assert.equal(response.status, 200);

    const pngPath = `slides/${crypto.randomUUID()}.jpg`;
    const pngTicket = await bucket.createSignedUploadUrl(pngPath);
    const png = await anon.storage
      .from("culture-images")
      .uploadToSignedUrl(pngTicket.data!.path, pngTicket.data!.token, TINY_JPEG, { contentType: "image/png" });
    assert.ok(png.error, "PNG türü reddedilmeli");
    await bucket.remove([pngPath]);
  } finally {
    await bucket.remove([path]);
  }
});
