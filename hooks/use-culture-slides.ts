"use client";

import { useEffect, useMemo, useState } from "react";

import { liveSlides, type CultureSlide } from "@/lib/culture/model";
import { fetchPublishedSlides } from "@/lib/culture/query";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** TV gün boyu açık kalır: içerikler dakikada bir tazelenir, tarih süzgeci dakikada bir yeniden uygulanır. */
const REFRESH_INTERVAL_MS = 60_000;

export function useCultureSlides(initialSlides: CultureSlide[]): CultureSlide[] {
  const [slides, setSlides] = useState(initialSlides);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
      if (!isSupabaseConfigured()) return;
      void fetchPublishedSlides(getSupabaseBrowserClient(), getSupabaseEnv().url).then((next) => {
        // Ağ hatasında eldeki içerikler ekranda kalır.
        if (next) setSlides(next);
      });
    };
    const id = window.setInterval(tick, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => liveSlides(slides, now), [slides, now]);
}
