'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Restaurant } from '@/lib/restaurants';

import { useRestaurantData } from '../_hooks/use-restaurant-data';
import { useExploreStore, useExploreUI } from '../_stores/explore-store';
import type { ExploreViewState } from '../_stores/explore-store';

import { SearchBar } from './search-bar';
import { FilterBar } from './filter-bar';
import { MapPanel } from './map-panel';
import { RestaurantList } from './restaurant-list';
import { SelectedRestaurantReviews } from './selected-restaurant-reviews';

type ExploreViewProps = {
  initialQuery: string;
  initialPage: number;
};

export function ExploreView({ initialQuery, initialPage }: ExploreViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    query,
    restaurants,
    pagination,
    errorMessage,
    filters,
    activeFilterCount,
  } = useRestaurantData(initialQuery, initialPage);

  const { showFilters, showListMobile, hoveredId } = useExploreUI();
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const {
    setInputValue,
    setPriceFilter,
    setRatingFilter,
    toggleFilters,
    clearAllFilters,
    setHoveredId,
  } = useExploreStore(
    (
      state: Pick<
        ExploreViewState,
        | 'setInputValue'
        | 'setPriceFilter'
        | 'setRatingFilter'
        | 'toggleFilters'
        | 'clearAllFilters'
        | 'setHoveredId'
      >,
    ) => state,
  );

  useEffect(() => {
    setInputValue(query);
  }, [query, setInputValue]);

  const replaceSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });

      const queryString = nextParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const handleSearchSubmit = useCallback(
    (value: string) => {
      replaceSearchParams({ q: value || null, page: '1' });
    },
    [replaceSearchParams],
  );

  const handleSearchClear = useCallback(() => {
    replaceSearchParams({ q: null, page: '1' });
  }, [replaceSearchParams]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      replaceSearchParams({ page: String(nextPage) });
    },
    [replaceSearchParams],
  );

  const isLoading = useExploreStore((s) => s.isLoading);

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div
          className={`relative min-h-[42vh] shrink-0 overflow-hidden bg-muted lg:min-h-0 lg:flex-1 ${
            showListMobile ? 'lg:flex' : 'flex'
          }`}
        >
          <MapPanel
            restaurants={restaurants}
            hoveredId={hoveredId}
            selectedId={selectedRestaurant?.id ?? null}
            onHover={setHoveredId}
            onSelect={setSelectedRestaurant}
            query={query}
          />

          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-2 sm:inset-x-4 sm:top-4 lg:inset-x-5 lg:top-5">
            <div className="pointer-events-auto max-w-2xl">
              <SearchBar
                value={searchParams.get('q') ?? ''}
                onChange={setInputValue}
                onSubmit={handleSearchSubmit}
                onClear={handleSearchClear}
                activeFilterCount={activeFilterCount}
                showFilters={showFilters}
                onToggleFilters={toggleFilters}
              />
            </div>

            {showFilters && (
              <div className="pointer-events-auto max-w-2xl">
                <FilterBar
                  filters={filters}
                  activeCount={activeFilterCount}
                  onPriceChange={setPriceFilter}
                  onRatingChange={setRatingFilter}
                  onClearAll={clearAllFilters}
                />
              </div>
            )}
          </div>
        </div>

        <RestaurantList
          restaurants={restaurants}
          pagination={pagination}
          errorMessage={errorMessage}
          isLoading={isLoading}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          onSelect={setSelectedRestaurant}
          onPageChange={handlePageChange}
        />

        <SelectedRestaurantReviews
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
        />
      </div>
    </div>
  );
}
