"use client";

import { cn } from "@/lib/utils";

type PaginationDotsProps = {
  pageCount: number;
  activePage: number;
  onSelect: (page: number) => void;
};

export function PaginationDots({
  pageCount,
  activePage,
  onSelect,
}: PaginationDotsProps) {
  if (pageCount < 2) return null;

  return (
    <div className="flex items-center justify-center gap-[clamp(6px,0.55vw,12px)]">
      {Array.from({ length: pageCount }).map((_, index) => {
        const isActive = index === activePage;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect(index)}
            aria-label={`${index + 1}. sayfa`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-full transition-all",
              isActive
                ? "size-[clamp(10px,0.8vw,16px)] bg-brand-700"
                : "size-[clamp(7px,0.58vw,12px)] bg-brand-200",
            )}
          />
        );
      })}
    </div>
  );
}
