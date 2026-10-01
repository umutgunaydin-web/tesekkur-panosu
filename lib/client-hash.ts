import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * İstemci IP'sinin tuzlu özeti. Ham IP saklanmaz; yalnız hız sınırı için
 * aynı kaynaktan gelen istekleri saymaya yarar.
 */
export async function getClientHash(): Promise<string | null> {
  const list = await headers();
  const ip =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip")?.trim();

  if (!ip) return null;

  return createHash("sha256").update(`tesekkur-panosu:${ip}`).digest("hex").slice(0, 32);
}
