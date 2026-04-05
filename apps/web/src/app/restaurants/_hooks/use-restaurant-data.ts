'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  buildRestaurantsUrl,
  normalizeRestaurantsResponse,
} from '../../lib/restaurants';
import {
  useExploreStore,
  useExploreRestaurants,
  useExploreFilters,
  useExploreLoading,
  useExploreError,
  useExplorePagination,
} from '../_stores/explore-store';
import type { Restaurant } from '../_stores/explore-store';

const DEFAULT_PAGE_SIZE = 12;

function toPositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function applyLocalFilter(items: Restaurant[], query: string): Restaurant[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter((item) => {
    const haystack = [
      item.name,
      item.description,
      item.category?.name,
      item.city,
      item.district,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function applyClientFilters(
  items: Restaurant[],
  price: string | null,
  rating: number | null,
): Restaurant[] {
  let filtered = items;

  if (price) {
    filtered = filtered.filter((r) => r.price_range === price);
  }

  if (rating !== null) {
    filtered = filtered.filter((r) => (r.average_rating ?? 0) >= rating);
  }

  return filtered;
}

export function useRestaurantData(initialQuery: string, initialPage: number) {
  const searchParams = useSearchParams();

  const query = (searchParams.get('q') ?? initialQuery).trim();
  const page = toPositiveInt(searchParams.get('page')) ?? initialPage;

  const restaurants = useExploreRestaurants();
  const filters = useExploreFilters();
  const isLoading = useExploreLoading();
  const errorMessage = useExploreError();
  const pagination = useExplorePagination();

  useEffect(() => {
    useExploreStore.getState().setInputValue(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurants() {
      useExploreStore.getState().setLoading(true);
      useExploreStore.getState().setError(null);

      try {
        const response = await fetch(
          buildRestaurantsUrl(page, DEFAULT_PAGE_SIZE, query),
          { cache: 'no-store', signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        const normalized = normalizeRestaurantsResponse(payload);

        const locallyFiltered = applyLocalFilter(normalized.data, query);
        const clientFiltered = applyClientFilters(
          locallyFiltered,
          filters.price,
          filters.rating,
        );

        useExploreStore.getState().setRestaurants(clientFiltered);
        useExploreStore.getState().setPagination(normalized.pagination);
      } catch (error) {
        if (controller.signal.aborted) return;

        useExploreStore.getState().setRestaurants([]);
        useExploreStore
          .getState()
          .setError(
            error instanceof Error
              ? `Could not load restaurants right now (${error.message}).`
              : 'Could not load restaurants right now.',
          );
      } finally {
        if (!controller.signal.aborted) {
          useExploreStore.getState().setLoading(false);
        }
      }
    }

    void loadRestaurants();
    return () => controller.abort();
  }, [page, query, filters.price, filters.rating]);

  const activeFilterCount = useMemo(
    () => [filters.price, filters.rating].filter(Boolean).length,
    [filters.price, filters.rating],
  );

  const isEmpty = useMemo(
    () => !isLoading && !errorMessage && restaurants.length === 0,
    [isLoading, errorMessage, restaurants.length],
  );

  const displayLoading = useMemo(
    () => isLoading && !errorMessage,
    [isLoading, errorMessage],
  );

  return {
    query,
    page,
    restaurants,
    pagination,
    isLoading,
    errorMessage,
    filters,
    activeFilterCount,
    isEmpty,
    displayLoading,
  };
}
