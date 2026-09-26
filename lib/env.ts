/**
 * Ortam değişkenleri tek noktadan okunur; anahtarlar asla koda gömülmez.
 * Değer eksikse uygulama sessizce bozulmak yerine anlaşılır bir hata verir.
 */
function readPublicEnv(key: string, value: string | undefined): string {
  if (value) return value;

  throw new Error(
    `Eksik ortam değişkeni: ${key}. Değeri .env.local dosyasına (Vercel'de Project Settings > Environment Variables) ekleyin.`,
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseEnv() {
  return {
    url: readPublicEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: readPublicEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}

function isLocalUrl(value: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(value);
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const onVercel = process.env.VERCEL === "1";

  if (configured && !(onVercel && isLocalUrl(configured))) {
    return configured;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

