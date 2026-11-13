"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import { createCultureImageUpload } from "@/app/admin/kultur/actions";
import { Button } from "@/components/ui/button";
import { computeCrop, MIN_IMAGE_WIDTH, OUTPUT_IMAGE_WIDTH, SLIDE_ASPECT } from "@/lib/culture/crop";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CULTURE_IMAGE_BUCKET } from "@/lib/culture/query";

type Loaded = { image: HTMLImageElement; url: string; name: string };

function loadImage(file: File): Promise<Loaded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url, name: file.name });
    image.onerror = () => reject(new Error("Görsel açılamadı."));
    image.src = url;
  });
}

function cropToBlob(image: HTMLImageElement, focusX: number, focusY: number): Promise<Blob> {
  const crop = computeCrop(image.naturalWidth, image.naturalHeight, focusX, focusY, SLIDE_ASPECT);
  const width = Math.min(OUTPUT_IMAGE_WIDTH, crop.width);
  const height = Math.round(width / SLIDE_ASPECT);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Görsel hazırlanamadı."))), "image/jpeg", 0.85),
  );
}

/**
 * Görsel seç → odak noktasına dokun → ekran alanı oranında kırpılmış JPEG doğrudan Storage'a
 * yüklenir. Önizleme, yüklenen dosyanın kendisini gösterir.
 */
export function ImageField({
  path,
  url,
  onChange,
}: {
  path: string | null;
  url: string | null;
  onChange: (next: { path: string | null; url: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (loaded) URL.revokeObjectURL(loaded.url);
  }, [loaded]);

  const upload = async (source: Loaded, nextFocus: { x: number; y: number }) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await cropToBlob(source.image, nextFocus.x, nextFocus.y);
      const ticket = await createCultureImageUpload("image/jpeg");
      if (ticket.status === "error") throw new Error(ticket.message);

      const { error: uploadError } = await getSupabaseBrowserClient()
        .storage.from(CULTURE_IMAGE_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: "image/jpeg" });
      if (uploadError) throw new Error("Görsel yüklenemedi, tekrar dene.");

      onChange({ path: ticket.path, url: URL.createObjectURL(blob) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Görsel yüklenemedi.");
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lütfen bir fotoğraf seç.");
      return;
    }
    try {
      const next = await loadImage(file);
      const start = { x: 0.5, y: 0.5 };
      setLoaded(next);
      setFocus(start);
      await upload(next, start);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Görsel açılamadı.");
    }
  };

  const tooSmall = loaded
    ? computeCrop(loaded.image.naturalWidth, loaded.image.naturalHeight, 0.5, 0.5, SLIDE_ASPECT).width < MIN_IMAGE_WIDTH
    : false;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id="slide-image"
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {loaded ? (
        <div>
          <p className="mb-1.5 text-xs text-slate-500">
            Fotoğrafta ekranda ortada kalmasını istediğin noktaya dokun.
          </p>
          <button
            type="button"
            className="relative block w-full overflow-hidden rounded-xl border border-brand-200"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const next = {
                x: (event.clientX - rect.left) / rect.width,
                y: (event.clientY - rect.top) / rect.height,
              };
              setFocus(next);
              void upload(loaded, next);
            }}
            disabled={busy}
            aria-label="Odak noktasını seç"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- yerel blob önizlemesi */}
            <img src={loaded.url} alt="" className="block w-full" />
            <span
              className="pointer-events-none absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-600/60 shadow"
              style={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}
            />
          </button>
        </div>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element -- kayıtlı slayt görseli
        <img src={url} alt="" className="block aspect-[1388/808] w-full rounded-xl border border-brand-200 object-cover" />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" />
          {busy ? "Yükleniyor..." : path ? "Görseli değiştir" : "Görsel ekle"}
        </Button>
        {path ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setLoaded(null);
              onChange({ path: null, url: null });
            }}
          >
            <Trash2 className="size-4" />
            Kaldır
          </Button>
        ) : null}
      </div>

      {tooSmall ? (
        <p className="text-sm text-amber-700">
          Bu fotoğraf TV için küçük, ekranda bulanık görünebilir. Daha büyük bir fotoğraf önerilir.
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
