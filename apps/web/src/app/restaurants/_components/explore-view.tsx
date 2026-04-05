'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { useRestaurantData } from '../_hooks/use-restaurant-data';
import { useExploreStore, useExploreUI } from '../_stores/explore-store';
import type { ExploreViewState } from '../_stores/explore-store';

import { SearchBar } from './search-bar';
import { FilterBar } from './filter-bar';
import { MapPanel } from './map-panel';
import { RestaurantList } from './restaurant-list';

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
    page,
    restaurants,
    pagination,
    errorMessage,
    filters,
    activeFilterCount,
  } = useRestaurantData(initialQuery, initialPage);

  const { showFilters, showListMobile, hoveredId } = useExploreUI();
  const {
    setInputValue,
    setPriceFilter,
    setRatingFilter,
    toggleFilters,
    clearAllFilters,
    setHoveredId,
    toggleListMobile,
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
        | 'toggleListMobile'
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
  const displayLoading = useMemo(
    () => isLoading && !errorMessage,
    [isLoading, errorMessage],
  );

  const isEmpty = useMemo(
    () => !isLoading && !errorMessage && restaurants.length === 0,
    [isLoading, errorMessage, restaurants.length],
  );

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background">
      <SearchBar
        value={searchParams.get('q') ?? ''}
        onChange={setInputValue}
        onSubmit={handleSearchSubmit}
        onClear={handleSearchClear}
        activeFilterCount={activeFilterCount}
        showFilters={showFilters}
        onToggleFilters={toggleFilters}
      />

      {showFilters && (
        <FilterBar
          filters={filters}
          activeCount={activeFilterCount}
          onPriceChange={setPriceFilter}
          onRatingChange={setRatingFilter}
          onClearAll={clearAllFilters}
        />
      )}

      <div className="relative flex flex-1 overflow-hidden">
        <div
          className={`relative hidden flex-1 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,_#f8fbff,_#eef4fa_55%,_#e8eef7_100%)] lg:block ${
            showListMobile ? 'lg:flex' : 'flex'
          }`}
        >
          <MapPanel
            restaurants={restaurants}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            query={query}
          />
        </div>

        <RestaurantList
          restaurants={restaurants}
          pagination={pagination}
          errorMessage={errorMessage}
          isLoading={isLoading}
          hoveredId={hoveredId}
          onHover={setHoveredId}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}
