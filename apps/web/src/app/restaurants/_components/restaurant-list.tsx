'use client';

import { useMemo } from 'react';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Skeleton,
} from 'ui-common';
import type { Restaurant, PaginationMeta } from '../../lib/restaurants';
import { ErrorCallout } from '../../../components/callouts';
import { RestaurantListItem } from './restaurant-list-item';

interface RestaurantListProps {
  restaurants: Restaurant[];
  pagination: PaginationMeta;
  errorMessage: string | null;
  isLoading: boolean;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onPageChange: (page: number) => void;
}

export function RestaurantList({
  restaurants,
  pagination,
  errorMessage,
  isLoading,
  hoveredId,
  onHover,
  onPageChange,
}: RestaurantListProps) {
  const isEmpty = useMemo(
    () => !isLoading && !errorMessage && restaurants.length === 0,
    [isLoading, errorMessage, restaurants.length],
  );

  const displayLoading = useMemo(
    () => isLoading && !errorMessage,
    [isLoading, errorMessage],
  );

  return (
    <div className="flex flex-col overflow-hidden border-r border-border/60 bg-muted/10 lg:flex lg:w-[420px] lg:shrink-0 lg:border-r">
      {/* Results count */}
      <div className="shrink-0 border-b border-border/60 bg-background px-4 py-2 text-xs text-muted-foreground">
        {displayLoading
          ? 'Searching...'
          : `${pagination.total} result${pagination.total !== 1 ? 's' : ''} found`}
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="px-4 py-3">
          <ErrorCallout message="Unable to load" details={errorMessage} />
        </div>
      )}

      {/* Loading skeletons */}
      {displayLoading && (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-3"
            >
              <Skeleton className="mb-2 h-32 w-full rounded-lg" />
              <Skeleton className="mb-1.5 h-4 w-3/4" />
              <Skeleton className="mb-1 h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex-1 p-4">
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyTitle>No restaurants found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your search or filters.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      )}

      {/* Results list */}
      {!isLoading && !errorMessage && restaurants.length > 0 && (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {restaurants.map((restaurant) => (
            <RestaurantListItem
              key={restaurant.id}
              restaurant={restaurant}
              isHovered={hoveredId === restaurant.id}
              onHover={() => onHover(restaurant.id)}
              onLeave={() => onHover(null)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {pagination.page} of {Math.max(1, pagination.total_pages)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                disabled={!pagination.has_previous || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={!pagination.has_next || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
