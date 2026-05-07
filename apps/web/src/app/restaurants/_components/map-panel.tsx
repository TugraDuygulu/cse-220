'use client';

import { RiStarFill } from '@remixicon/react';
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from '@/components/ui/map';
import type { Restaurant } from '@/lib/restaurants';

interface MapPanelProps {
  restaurants: Restaurant[];
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (restaurant: Restaurant) => void;
  query: string;
}

const DEFAULT_CENTER: [number, number] = [28.9784, 41.0082];
export function MapPanel({
  restaurants,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  query,
}: MapPanelProps) {
  return (
    <div className="relative flex-1 overflow-hidden bg-muted">
      <Map
        className="h-full w-full"
        center={DEFAULT_CENTER}
        zoom={12}
        cooperativeGestures
      >
        {restaurants.map((restaurant) => {
          if (
            restaurant.longitude === undefined ||
            restaurant.latitude === undefined
          ) {
            return null;
          }

          const isActive =
            hoveredId === restaurant.id || selectedId === restaurant.id;

          return (
            <MapMarker
              key={restaurant.id}
              longitude={restaurant.longitude}
              latitude={restaurant.latitude}
              onClick={() => onSelect(restaurant)}
              onMouseEnter={() => onHover(restaurant.id)}
              onMouseLeave={() => onHover(null)}
            >
              <MarkerContent>
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-all duration-150 ${
                    isActive
                      ? 'scale-110 border-primary bg-primary text-primary-foreground'
                      : 'border-white/80 bg-white/95 text-foreground backdrop-blur-sm hover:border-primary/50'
                  }`}
                >
                  {isActive ? (
                    <span className="max-w-32 truncate">
                      {restaurant.name}
                    </span>
                  ) : (
                    <>
                      <RiStarFill className="size-3 text-amber-500" />
                      {restaurant.average_rating?.toFixed(1) ?? 'N/A'}
                    </>
                  )}
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <div className="space-y-1">
                  <p className="text-xs font-semibold">{restaurant.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {restaurant.district || restaurant.city || 'Restaurant'}
                  </p>
                </div>
              </MarkerTooltip>
            </MapMarker>
          );
        })}
      </Map>

      <div className="absolute right-3 bottom-3 rounded-lg border border-border/70 bg-white/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        {query
          ? `Results for "${query}"`
          : `${restaurants.length} places nearby`}
      </div>
    </div>
  );
}
