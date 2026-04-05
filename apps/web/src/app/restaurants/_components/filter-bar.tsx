'use client';

import { RiStarFill } from '@remixicon/react';
import type { ExploreFilters } from '../_stores/explore-store';

interface FilterBarProps {
  filters: ExploreFilters;
  activeCount: number;
  onPriceChange: (price: string | null) => void;
  onRatingChange: (rating: number | null) => void;
  onClearAll: () => void;
}

export function FilterBar({
  filters,
  activeCount,
  onPriceChange,
  onRatingChange,
  onClearAll,
}: FilterBarProps) {
  return (
    <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
      <span className="text-xs font-medium text-muted-foreground">Price:</span>
      {['1', '2', '3'].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPriceChange(filters.price === p ? null : p)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filters.price === p
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          }`}
        >
          {'€'.repeat(Number(p))}
        </button>
      ))}

      <span className="ml-2 text-xs font-medium text-muted-foreground">
        Rating:
      </span>
      {[3, 4, 4.5].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onRatingChange(filters.rating === r ? null : r)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            filters.rating === r
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          }`}
        >
          <RiStarFill className="size-3 text-amber-500" />
          {r}+
        </button>
      ))}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
