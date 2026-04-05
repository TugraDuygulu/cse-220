'use client';

import { RiStarFill } from '@remixicon/react';
import type { Restaurant } from '../../lib/restaurants';

interface MapPanelProps {
  restaurants: Restaurant[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  query: string;
}

const MARKER_POSITIONS = [
  { left: '22%', top: '30%' },
  { left: '45%', top: '55%' },
  { left: '68%', top: '25%' },
  { left: '35%', top: '70%' },
  { left: '78%', top: '60%' },
  { left: '15%', top: '45%' },
  { left: '55%', top: '38%' },
  { left: '85%', top: '42%' },
  { left: '30%', top: '20%' },
  { left: '60%', top: '75%' },
  { left: '42%', top: '15%' },
  { left: '72%', top: '80%' },
];

export function MapPanel({
  restaurants,
  hoveredId,
  onHover,
  query,
}: MapPanelProps) {
  return (
    <div className="relative hidden flex-1 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,_#f8fbff,_#eef4fa_55%,_#e8eef7_100%)] lg:block lg:flex">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,transparent_0,transparent_48%,rgba(163,181,205,.2)_50%,transparent_52%,transparent_100%),linear-gradient(180deg,transparent_0,transparent_48%,rgba(163,181,205,.18)_50%,transparent_52%,transparent_100%)] [background-size:56px_56px]" />

      {/* Roads */}
      <div className="absolute inset-0">
        <div className="absolute top-[35%] left-0 h-1 w-full bg-white/70 shadow-sm" />
        <div className="absolute top-[60%] left-0 h-0.5 w-full bg-white/50" />
        <div className="absolute top-0 left-[40%] h-full w-1 bg-white/70 shadow-sm" />
        <div className="absolute top-0 left-[70%] h-full w-0.5 bg-white/50" />
      </div>

      {/* Markers */}
      {restaurants.map((restaurant, index) => {
        const marker = MARKER_POSITIONS[index % MARKER_POSITIONS.length];
        const isHovered = hoveredId === restaurant.id;

        return (
          <button
            key={restaurant.id}
            type="button"
            onMouseEnter={() => onHover(restaurant.id)}
            onMouseLeave={() => onHover(null)}
            className={`absolute z-10 inline-flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-all duration-150 ${
              isHovered
                ? 'z-20 scale-110 border-primary bg-primary text-primary-foreground'
                : 'border-white/80 bg-white/95 text-foreground backdrop-blur-sm hover:border-primary/50'
            }`}
            style={{ left: marker.left, top: marker.top }}
          >
            {isHovered ? (
              <span className="max-w-28 truncate">{restaurant.name}</span>
            ) : (
              <>
                <RiStarFill className="size-3 text-amber-500" />
                {restaurant.average_rating?.toFixed(1) ?? '4.5'}
              </>
            )}
          </button>
        );
      })}

      {/* Map legend */}
      <div className="absolute right-3 bottom-3 rounded-lg border border-border/70 bg-white/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        {query
          ? `Results for "${query}"`
          : `${restaurants.length} places nearby`}
      </div>
    </div>
  );
}
