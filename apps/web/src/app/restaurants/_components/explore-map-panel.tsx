import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from 'ui-common';
import {
  RiMapPin2Fill,
  RiRoadMapLine,
  RiFilter3Line,
  RiRouteLine,
} from '@remixicon/react';

import type { Restaurant } from '@/lib/restaurants';

type ExploreMapPanelProps = {
  restaurants: Restaurant[];
  query: string;
};

export function ExploreMapPanel({ restaurants, query }: ExploreMapPanelProps) {
  const topPicks = restaurants.slice(0, 3);

  return (
    <Card className="overflow-hidden border-border/70 bg-card/95">
      <CardHeader className="gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Map explorer</CardTitle>
          <Badge variant="secondary">Live area</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1">
            <RiFilter3Line className="size-3.5" />
            Price
          </Badge>
          <Badge variant="outline" className="gap-1">
            <RiRoadMapLine className="size-3.5" />
            Cuisine
          </Badge>
          <Badge variant="outline" className="gap-1">
            <RiRouteLine className="size-3.5" />
            Sort by distance
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-[radial-gradient(circle_at_20%_20%,_#f8fbff,_#eef4fa_55%,_#e8eef7_100%)]">
          <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(90deg,transparent_0,transparent_48%,rgba(163,181,205,.22)_50%,transparent_52%,transparent_100%),linear-gradient(180deg,transparent_0,transparent_48%,rgba(163,181,205,.2)_50%,transparent_52%,transparent_100%)] [background-size:54px_54px]" />

          <div className="relative h-72 p-4">
            {markerPoints.map((point, index) => (
              <button
                key={index}
                type="button"
                className="absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-primary/30 bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-md"
                style={{ left: point.left, top: point.top }}
              >
                <RiMapPin2Fill className="size-3.5" />
                {index + 1}
              </button>
            ))}

            <div className="absolute right-3 bottom-3 rounded-lg border border-border/70 bg-white/90 p-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              {query ? `Search: "${query}"` : 'Showing nearby restaurants'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick picks
          </p>
          {topPicks.length ? (
            <div className="space-y-2">
              {topPicks.map((restaurant, index) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {restaurant.name}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      Pin {index + 1} • {restaurant.city || 'Unknown city'}
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                  >
                    <Link href={`/restaurants/${restaurant.slug}`}>Open</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Quick picks appear once listings load.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const markerPoints = [
  { left: '18%', top: '26%' },
  { left: '34%', top: '62%' },
  { left: '52%', top: '40%' },
  { left: '68%', top: '24%' },
  { left: '80%', top: '68%' },
];
