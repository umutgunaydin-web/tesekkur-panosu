"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CategoryFilters } from "@/components/wall/CategoryFilters";
import { PaginationDots } from "@/components/wall/PaginationDots";
import { RecognitionGrid } from "@/components/wall/RecognitionGrid";
import { WallHeader } from "@/components/wall/WallHeader";
import { useReactionCounts } from "@/hooks/use-reaction-counts";
import { useThanksStream } from "@/hooks/use-thanks-stream";
import { filterMessages } from "@/lib/categories";
import { CARDS_PER_PAGE, type ThanksMessage } from "@/lib/types";

/** Birden fazla sayfa varsa kartlar bu aralıkla döner. */
const PAGE_ROTATION_MS = 12_000;

type AppreciationWallProps = {
  initialMessages: ThanksMessage[];
  initialMonthlyCount: number;
};

export function AppreciationWall({
  initialMessages,
  initialMonthlyCount,
}: AppreciationWallProps) {
  const { messages, monthlyCount } = useThanksStream(
    initialMessages,
    initialMonthlyCount,
  );
  const reactions = useReactionCounts(
    useMemo(() => messages.map((message) => message.id), [messages]),
  );
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(0);
  // Kullanıcı etkileşiminden sonra otomatik dönüş sayacını sıfırlamak için.
  const [rotationSeed, setRotationSeed] = useState(0);

  const filteredMessages = useMemo(
    () => filterMessages(messages, activeFilter),
    [messages, activeFilter],
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filteredMessages.length / CARDS_PER_PAGE),
  );
  const activePage = Math.min(page, pageCount - 1);

  const visibleMessages = filteredMessages.slice(
    activePage * CARDS_PER_PAGE,
    activePage * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  useEffect(() => {
    if (page === activePage) return;

    setPage(activePage);
  }, [page, activePage]);

  useEffect(() => {
    if (pageCount < 2) return;

    const intervalId = window.setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, PAGE_ROTATION_MS);

    return () => window.clearInterval(intervalId);
  }, [pageCount, rotationSeed]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilter(filterId);
    setPage(0);
    setRotationSeed((current) => current + 1);
  }, []);

  const handlePageSelect = useCallback((nextPage: number) => {
    setPage(nextPage);
    setRotationSeed((current) => current + 1);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-[clamp(8px,0.9vw,18px)] px-[clamp(14px,1.3vw,32px)] py-[clamp(12px,1.1vw,24px)]">
      <WallHeader monthlyCount={monthlyCount} />

      <CategoryFilters
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />

      <section className="flex min-h-0 flex-1 flex-col gap-[clamp(8px,0.8vw,18px)] rounded-[30px] bg-white/65 p-[clamp(10px,1vw,22px)]">
        <div className="min-h-0 flex-1">
          <RecognitionGrid messages={visibleMessages} reactions={reactions} />
        </div>

        <PaginationDots
          pageCount={pageCount}
          activePage={activePage}
          onSelect={handlePageSelect}
        />
      </section>

      <p
        className="self-end pr-[clamp(4px,0.6vw,16px)] font-hand leading-tight text-ink-soft/70"
        style={{ fontSize: "clamp(15px, 1.15vw, 24px)" }}
      >
        Teşekkürle daha da güçlüyüz. ♡
      </p>
    </div>
  );
}
