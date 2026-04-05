'use client';

import Link from 'next/link';
import { Badge, Button } from 'ui-common';
import {
  RiMapPinLine,
  RiRouteLine,
  RiStarFill,
  RiTimeLine,
} from '@remixicon/react';
import {
  getRestaurantCoverImage,
  getRestaurantDistanceKm,
  getRestaurantIsOpen,
  type Restaurant,
} from '../../lib/restaurants';

interface RestaurantListItemProps {
  restaurant: Restaurant;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export function RestaurantListItem({
  restaurant,
  isHovered,
  onHover,
  onLeave,
}: RestaurantListItemProps) {
  const imageUrl = getRestaurantCoverImage(restaurant.slug);
  const distanceKm = getRestaurantDistanceKm(restaurant.slug);
  const isOpen = getRestaurantIsOpen(restaurant.slug);

  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group block overflow-hidden rounded-xl border transition-all duration-200 ${
        isHovered
          ? 'border-primary/50 bg-card shadow-md ring-1 ring-primary/10'
          : 'border-border/60 bg-card/80 hover:border-border hover:shadow-sm'
      }`}
    >
      <div className="flex">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden">
          <img
            src={imageUrl}
            alt={restaurant.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/30" />
        </div>

        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground">
                {restaurant.name}
              </h3>
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                <RiStarFill className="size-3 text-amber-500" />
                {restaurant.average_rating?.toFixed(1) ?? 'N/A'}
              </span>
            </div>

            <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {restaurant.description?.trim() || 'Neighborhood favorite.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <RiMapPinLine className="size-3" />
              {restaurant.city || 'Unknown'}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <RiRouteLine className="size-3" />
              {distanceKm.toFixed(1)} km
            </span>
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] ${
                isOpen ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              <RiTimeLine className="size-3" />
              {isOpen ? 'Open' : 'Closed'}
            </span>
            {restaurant.category?.name && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {restaurant.category.name}
              </Badge>
            )}
            {restaurant.price_range && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                {restaurant.price_range}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
