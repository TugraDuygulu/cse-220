'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  Drawer,
  DrawerContent,
  Skeleton,
} from 'ui-common';
import { RiCloseLine, RiStarFill } from '@remixicon/react';

import type { Restaurant } from '@/lib/restaurants';
import { fetchRestaurantReviews, type Review } from '@/lib/reviews';
import { ReviewSection } from './review-section';

type SelectedRestaurantReviewsProps = {
  restaurant: Restaurant | null;
  onClose: () => void;
};

type ReviewState = {
  reviews: Review[];
  total: number;
  isLoading: boolean;
  error: string | null;
};

const initialState: ReviewState = {
  reviews: [],
  total: 0,
  isLoading: false,
  error: null,
};

export function SelectedRestaurantReviews({
  restaurant,
  onClose,
}: SelectedRestaurantReviewsProps) {
  const [state, setState] = useState<ReviewState>(initialState);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!restaurant) {
      setState(initialState);
      return;
    }

    const selectedRestaurant = restaurant;
    let isActive = true;

    async function loadReviews() {
      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const response = await fetchRestaurantReviews(selectedRestaurant.slug, 1, 10);
        if (!isActive) return;

        setState({
          reviews: response.data,
          total: response.pagination.total,
          isLoading: false,
          error: null,
        });
      } catch {
        if (!isActive) return;
        setState({
          reviews: [],
          total: 0,
          isLoading: false,
          error: 'Could not load reviews for this restaurant.',
        });
      }
    }

    void loadReviews();
    return () => {
      isActive = false;
    };
  }, [restaurant]);

  return (
    <>
      <aside className="hidden w-[420px] shrink-0 overflow-y-auto border-l border-border/60 bg-background lg:block">
        {restaurant ? (
          <PanelContent
            restaurant={restaurant}
            reviews={state.reviews}
            total={state.total}
            isLoading={state.isLoading}
            error={state.error}
            onClose={onClose}
          />
        ) : (
          <EmptySelection />
        )}
      </aside>

      {isMobile && (
        <Drawer open={Boolean(restaurant)} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent>
            {restaurant && (
              <div className="max-h-[78vh] overflow-y-auto px-2 pb-4">
                <PanelContent
                  restaurant={restaurant}
                  reviews={state.reviews}
                  total={state.total}
                  isLoading={state.isLoading}
                  error={state.error}
                  onClose={onClose}
                />
              </div>
            )}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}

function PanelContent({
  restaurant,
  reviews,
  total,
  isLoading,
  error,
  onClose,
}: {
  restaurant: Restaurant;
  reviews: Review[];
  total: number;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="p-0 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{restaurant.name}</h2>
            <p className="text-sm text-muted-foreground">
              {restaurant.district || restaurant.city || 'Restaurant'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close selected restaurant"
          >
            <RiCloseLine className="size-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 py-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 font-medium">
              <RiStarFill className="size-4 text-amber-500" />
              {restaurant.average_rating?.toFixed(1) ?? 'No rating'}
            </span>
            <span className="text-muted-foreground">
              {restaurant.review_count ?? total} review
              {(restaurant.review_count ?? total) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {restaurant.category?.name && (
              <span className="rounded-full border border-border/70 px-2 py-1">
                {restaurant.category.name}
              </span>
            )}
            {(restaurant.address_line1 || restaurant.city || restaurant.district) && (
              <span className="rounded-full border border-border/70 px-2 py-1">
                {[restaurant.address_line1, restaurant.district, restaurant.city]
                  .filter(Boolean)
                  .join(' • ')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : (
        <ReviewSection
          key={restaurant.slug}
          restaurantSlug={restaurant.slug}
          restaurantName={restaurant.name}
          initialReviews={reviews}
          totalReviews={total}
        />
      )}
    </div>
  );
}

function EmptySelection() {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium">Select a restaurant</p>
        <p className="text-xs text-muted-foreground">
          Choose a marker or result to read diner reviews and join the
          conversation.
        </p>
      </div>
    </div>
  );
}
