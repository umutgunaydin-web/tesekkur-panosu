"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SlideView } from "@/components/culture/SlideView";
import { SLIDE_DURATION_MS, type CultureSlide } from "@/lib/culture/model";

/** Henüz yayında içerik yokken boş kutu yerine panonun kendi daveti görünür. */
function EmptyState() {
  return (
    <div className="flex size-full items-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-[7cqw] text-white [container-type:size]">
      <div className="max-w-[70cqw]">
        <p className="font-bold tracking-[0.14em] text-sun uppercase" style={{ fontSize: "1.6cqw" }}>
          Kültür Ekranı
        </p>
        <h2 className="mt-[2cqh] leading-[1.06] font-extrabold text-balance" style={{ fontSize: "6.4cqw" }}>
          Bugün kime teşekkür edeceksin?
        </h2>
        <p className="mt-[3cqh] max-w-[56cqw] text-white/80" style={{ fontSize: "2.3cqw" }}>
          Bir çalışma arkadaşına teşekkür etmek için soldaki QR kodu telefonunla okut.
        </p>
      </div>
    </div>
  );
}

export function AnnouncementCarousel({
  slides,
  initialIndex = 0,
}: {
  slides: CultureSlide[];
  initialIndex?: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const activeIndex = slides.length ? Math.min(index, slides.length - 1) : 0;

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      SLIDE_DURATION_MS,
    );
    return () => window.clearInterval(id);
  }, [slides.length]);

  const slide = slides[activeIndex];

  return (
    <section className="relative h-full min-h-0 overflow-hidden rounded-[30px]">
      {!slide ? (
        <EmptyState />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <SlideView
              slide={slide}
              position={
                slides.length > 1
                  ? `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`
                  : undefined
              }
            />
          </motion.div>
        </AnimatePresence>
      )}

      {slides.length > 1 ? (
        <div className="absolute inset-x-[6%] bottom-[3.5%] flex gap-2">
          {slides.map((item, itemIndex) => (
            <span key={item.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              {itemIndex < activeIndex ? <span className="block h-full bg-sun" /> : null}
              {itemIndex === activeIndex ? (
                <span
                  key={`${item.id}-${activeIndex}`}
                  className="culture-motion block h-full origin-left bg-sun"
                  style={{ animation: `culture-progress ${SLIDE_DURATION_MS}ms linear forwards` }}
                />
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
