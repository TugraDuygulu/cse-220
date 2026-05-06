import Link from 'next/link';
import { AspectRatio, Badge, Card, CardContent, Button } from 'ui-common';
import {
  RiMapPinLine,
  RiRouteLine,
  RiStarFill,
  RiBookmarkLine,
  RiTimeLine,
} from '@remixicon/react';

import {
  getRestaurantCoverImage,
  getRestaurantDistanceKm,
  getRestaurantIsOpen,
  type Restaurant,
} from '@/lib/restaurants';

type RestaurantCardProps = {
  restaurant: Restaurant;
};

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const imageUrl = getRestaurantCoverImage(restaurant.slug);
  const distanceKm = getRestaurantDistanceKm(restaurant.slug);
  const isOpen = getRestaurantIsOpen(restaurant.slug);

  return (
    <Card className="group overflow-hidden border-border/70 bg-card/95 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <img
            src={imageUrl}
            alt={restaurant.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </AspectRatio>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <button
          type="button"
          aria-label="Save restaurant"
          className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-foreground/90 backdrop-blur transition-colors hover:bg-white"
        >
          <RiBookmarkLine className="size-4" />
        </button>
        <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-foreground">
          <RiStarFill className="size-3.5 text-amber-500" />
          {restaurant.average_rating?.toFixed(1) ?? '4.5'}
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground">
            {restaurant.name}
          </h3>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {restaurant.description?.trim() ||
              'Popular neighborhood spot with standout dishes and friendly service.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <RiMapPinLine className="size-3.5" />
            {restaurant.city || 'Unknown'}
            {restaurant.district ? `, ${restaurant.district}` : ''}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <RiRouteLine className="size-3.5" />
            {distanceKm.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
            <RiTimeLine className="size-3.5" />
            {isOpen ? 'Open now' : 'Closed'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {restaurant.category?.name ? (
            <Badge variant="secondary">{restaurant.category.name}</Badge>
          ) : null}
          {restaurant.price_range ? (
            <Badge variant="outline">{restaurant.price_range}</Badge>
          ) : null}
          <Badge variant="outline">
            {restaurant.review_count ?? 0} reviews
          </Badge>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="h-8 rounded-full px-3 text-xs">
            <Link href={`/restaurants/${restaurant.slug}`}>View details</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
          >
            <Link href={`/restaurants/${restaurant.slug}#reviews`}>
              See reviews
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
