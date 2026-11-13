"use client";

import { useMemo } from "react";

import { AnnouncementCarousel } from "@/components/culture/AnnouncementCarousel";
import { ThanksStrip } from "@/components/culture/ThanksStrip";
import { AloTechLogo } from "@/components/wall/AloTechLogo";
import { WallHeader } from "@/components/wall/WallHeader";
import { useCultureSlides } from "@/hooks/use-culture-slides";
import { useReactionCounts } from "@/hooks/use-reaction-counts";
import { useThanksStream } from "@/hooks/use-thanks-stream";
import type { CultureSlide } from "@/lib/culture/model";
import type { ThanksMessage } from "@/lib/types";

/**
 * Sol 1/4: logo ve altında teşekkür şeridi (QR başlıkta, mesajlar altından akar).
 * Sağ 3/4: panonun başlığı ve saat kartı; altında İK içerikleri.
 */
export function CultureScreen({
  initialMessages,
  initialMonthlyCount,
  submitUrl,
  initialSlides,
  initialSlide = 0,
}: {
  initialMessages: ThanksMessage[];
  initialMonthlyCount: number;
  submitUrl: string;
  initialSlides: CultureSlide[];
  initialSlide?: number;
}) {
  const slides = useCultureSlides(initialSlides);
  const { messages, monthlyCount } = useThanksStream(initialMessages, initialMonthlyCount);
  const reactions = useReactionCounts(
    useMemo(() => messages.map((message) => message.id), [messages]),
  );

  return (
    <main className="kiosk-screen grid h-screen w-screen grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-[clamp(10px,1vw,22px)] bg-page px-[clamp(14px,1.3vw,32px)] py-[clamp(12px,1.1vw,24px)]">
      <div className="flex min-h-0 flex-col gap-[clamp(8px,0.8vw,16px)]">
        <AloTechLogo className="pt-[clamp(4px,0.4vw,10px)] pl-[clamp(4px,0.4vw,10px)] [font-size:clamp(24px,1.9vw,42px)]" />
        <div className="min-h-0 flex-1">
          <ThanksStrip messages={messages} reactions={reactions} submitUrl={submitUrl} />
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-[clamp(8px,0.9vw,18px)]">
        <WallHeader monthlyCount={monthlyCount} />
        <div className="min-h-0 flex-1">
          <AnnouncementCarousel slides={slides} initialIndex={initialSlide} />
        </div>
      </div>
    </main>
  );
}
