"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Megaphone,
  Newspaper,
  PartyPopper,
  ScrollText,
  Sparkles,
} from "lucide-react";

import { Avatar } from "@/components/wall/Avatar";
import {
  formatEventAt,
  parseEmphasis,
  SLIDE_TYPE_LABELS,
  type CultureSlide,
  type SlideType,
} from "@/lib/culture/model";
import { cn } from "@/lib/utils";

const TYPE_STYLE: Record<SlideType, { background: string; icon: typeof Megaphone }> = {
  duyuru: { background: "from-brand-900 via-brand-700 to-brand-500", icon: Megaphone },
  etkinlik: { background: "from-brand-900 via-brand-800 to-brand-700", icon: CalendarDays },
  yeni_katilan: { background: "from-[#1c2b52] via-brand-700 to-brand-500", icon: PartyPopper },
  ik: { background: "from-brand-950 via-brand-900 to-[#31477f]", icon: Sparkles },
  politika: { background: "from-[#101a36] via-brand-900 to-brand-800", icon: ScrollText },
  haber: { background: "from-brand-800 via-brand-700 to-[#4a64a8]", icon: Newspaper },
};

/** Taşma olursa yazılar bu adımlarla küçülür; en küçüğünde de taşıyorsa panel uyarır. */
const FIT_STEPS = [1, 0.92, 0.85, 0.78, 0.72];

export type SlideFit = { scale: number; overflow: boolean; titleLines: number };

function Emphasis({ text }: { text: string }) {
  return (
    <>
      {parseEmphasis(text).map((segment, index) =>
        segment.bold ? (
          <strong key={index} className="font-extrabold text-sun">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Tek slayt. Tüm ölçüler slaytın kendi genişliğine (cqw) bağlıdır; TV'de ve
 * paneldeki küçük önizlemede satır kırılmaları aynı olur.
 */
export function SlideView({
  slide,
  position,
  onFit,
}: {
  slide: CultureSlide;
  /** "02 / 05" gibi sıra bilgisi; önizlemede boş kalabilir. */
  position?: string;
  onFit?: (fit: SlideFit) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const style = TYPE_STYLE[slide.type];
  const Icon = style.icon;
  // Görselli slaytta yazı sol yarıda kalır; görselin konusu sağda görünür.
  const hasImage = Boolean(slide.image_url) && !slide.person;
  const scale = FIT_STEPS[step];
  const fitKey = `${slide.title}|${slide.body}|${slide.bullets.join("|")}|${slide.eyebrow}|${slide.type}|${slide.image_url}|${slide.location}|${slide.event_at}`;

  // İçerik değişince en büyük boydan yeniden dener.
  useLayoutEffect(() => {
    setStep(0);
  }, [fitKey]);

  // Yazı tipi geç yüklenirse ilk ölçüm yedek yazı tipiyle yapılmış olur; yeniden ölç.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let active = true;
    void document.fonts?.ready.then(() => {
      if (!active) return;
      setFontsReady(true);
      setStep(0);
    });
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const title = titleRef.current;
    if (!content || !title) return;

    const overflow = content.scrollHeight > content.clientHeight + 1;
    if (overflow && step < FIT_STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    const lineHeight = parseFloat(getComputedStyle(title).lineHeight) || 1;
    onFit?.({ scale, overflow, titleLines: Math.round(title.scrollHeight / lineHeight) });
  }, [step, scale, fitKey, onFit, fontsReady]);

  const meta: { label: string; value: string }[] = [];
  if (slide.event_at) meta.push({ label: "Ne zaman", value: formatEventAt(slide.event_at) });
  if (slide.location) meta.push({ label: "Nerede", value: slide.location });

  return (
    <div
      className="relative size-full overflow-hidden text-white [container-type:size]"
      style={{ ["--fit" as string]: scale }}
    >
      {slide.image_url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage görseli, boyutu panelde sabitlenir */}
          <img src={slide.image_url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(16_26_54/0.95)_0%,rgb(16_26_54/0.85)_42%,rgb(16_26_54/0)_58%)]" />
        </>
      ) : (
        <div className={cn("absolute inset-0 bg-gradient-to-br", style.background)}>
          <Icon
            aria-hidden
            strokeWidth={1.2}
            className="pointer-events-none absolute -right-[4cqw] -bottom-[8cqh] size-[40cqw] text-white/[0.07]"
          />
          {slide.person ? null : (
            <div className="absolute top-[10cqh] right-[7cqw] size-[17cqw] rounded-full border-[1.3cqw] border-sun/25" />
          )}
        </div>
      )}

      <div
        className="relative grid h-full grid-cols-[minmax(0,1fr)_auto] items-center gap-[4cqw] px-[6cqw] pt-[5cqh] pb-[9cqh]"
      >
        <div
          ref={contentRef}
          className={cn("flex max-h-full min-w-0 flex-col justify-center overflow-hidden", hasImage ? "max-w-[44cqw]" : "max-w-[76cqw]")}
        >
          <div className="flex items-center gap-[1.2cqw]">
            <span
              className="rounded-[0.4cqw] bg-sun px-[0.9cqw] py-[0.3cqw] font-extrabold tracking-[0.12em] text-brand-950 uppercase"
              style={{ fontSize: "1.3cqw" }}
            >
              {SLIDE_TYPE_LABELS[slide.type]}
            </span>
            {position ? (
              <span className="font-bold text-white/60 tabular-nums" style={{ fontSize: "1.3cqw" }}>
                {position}
              </span>
            ) : null}
          </div>

          {slide.eyebrow ? (
            <p
              className="mt-[2cqh] font-bold tracking-[0.14em] text-sun uppercase"
              style={{ fontSize: "calc(1.55cqw * var(--fit))" }}
            >
              {slide.eyebrow}
            </p>
          ) : null}

          <h2
            ref={titleRef}
            className="mt-[1.4cqh] leading-[1.06] font-extrabold text-balance [overflow-wrap:anywhere]"
            style={{ fontSize: `calc(${hasImage ? 5.2 : 6.4}cqw * var(--fit))` }}
          >
            <Emphasis text={slide.title} />
          </h2>

          {slide.body ? (
            <p
              className="mt-[2.4cqh] max-w-[62cqw] leading-snug text-white/85 [overflow-wrap:anywhere]"
              style={{ fontSize: "calc(2.35cqw * var(--fit))" }}
            >
              <Emphasis text={slide.body} />
            </p>
          ) : null}

          {slide.bullets.length ? (
            <ul className="mt-[2.4cqh] grid gap-[1.2cqh]" style={{ fontSize: "calc(2.15cqw * var(--fit))" }}>
              {slide.bullets.map((bullet, index) => (
                <li key={index} className="flex items-baseline gap-[1cqw] leading-snug [overflow-wrap:anywhere]">
                  <span aria-hidden className="size-[0.9cqw] shrink-0 translate-y-[-0.2cqw] rounded-full bg-sun" />
                  <span>
                    <Emphasis text={bullet} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {meta.length ? (
            <dl className="mt-[3.4cqh] flex gap-[4cqw] border-t border-white/20 pt-[2.4cqh]">
              {meta.map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt
                    className="font-bold tracking-[0.12em] text-white/55 uppercase"
                    style={{ fontSize: "1.2cqw" }}
                  >
                    {item.label}
                  </dt>
                  <dd className="mt-[0.5cqh] font-extrabold" style={{ fontSize: "calc(2.05cqw * var(--fit))" }}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {slide.person ? (
          <div className="flex w-[27cqw] flex-col items-center rounded-[2.4cqw] bg-white/10 p-[2.4cqw] text-center ring-1 ring-white/20 backdrop-blur">
            <Avatar
              name={slide.person.name}
              avatarUrl={slide.person.avatar_url}
              ringClassName="ring-sun"
              className="size-[18cqw] text-[5cqw] ring-[0.45cqw]"
            />
            <p className="mt-[2cqh] font-extrabold leading-tight" style={{ fontSize: "2.5cqw" }}>
              {slide.person.name}
            </p>
            {slide.person_role ? (
              <p className="mt-[0.6cqh] text-white/70" style={{ fontSize: "1.65cqw" }}>
                {slide.person_role}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
