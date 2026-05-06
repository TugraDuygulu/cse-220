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

const DEFAULT_CENTER: [number, number] = [121.4737, 31.2304];
const DEFAULT_MARKERS = [
  [121.466, 31.236],
  [121.48, 31.225],
  [121.493, 31.238],
  [121.455, 31.218],
  [121.505, 31.22],
  [121.445, 31.245],
  [121.472, 31.252],
  [121.515, 31.242],
  [121.46, 31.204],
  [121.488, 31.206],
  [121.43, 31.227],
  [121.525, 31.213],
] as const;

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
        {restaurants.map((restaurant, index) => {
          const [fallbackLongitude, fallbackLatitude] =
            DEFAULT_MARKERS[index % DEFAULT_MARKERS.length];
          const longitude = restaurant.longitude ?? fallbackLongitude;
          const latitude = restaurant.latitude ?? fallbackLatitude;
          const isActive =
            hoveredId === restaurant.id || selectedId === restaurant.id;

          return (
            <MapMarker
              key={restaurant.id}
              longitude={longitude}
              latitude={latitude}
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
