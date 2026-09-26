"use client";

import { CATEGORY_FILTERS } from "@/lib/categories";
import { cn } from "@/lib/utils";

type CategoryFiltersProps = {
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
};

export function CategoryFilters({
  activeFilter,
  onFilterChange,
}: CategoryFiltersProps) {
  return (
    <nav className="flex flex-wrap items-center gap-[clamp(6px,0.6vw,14px)]">
      {CATEGORY_FILTERS.map((filter) => {
        const isActive = filter.id === activeFilter;

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onFilterChange(filter.id)}
            aria-pressed={isActive}
            className={cn(
              "rounded-full px-[clamp(14px,1.2vw,26px)] py-[clamp(6px,0.5vw,11px)] font-semibold transition-colors",
              isActive
                ? "bg-brand-700 text-white"
                : "bg-white/70 text-ink-soft hover:bg-white",
            )}
            style={{ fontSize: "clamp(11px, 0.8vw, 17px)" }}
          >
            {filter.label}
          </button>
        );
      })}
    </nav>
  );
}
