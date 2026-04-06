'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Input,
  Skeleton,
} from 'ui-common';
import { RiSearchLine } from '@remixicon/react';

import {
  buildRestaurantsUrl,
  normalizeRestaurantsResponse,
  type PaginationMeta,
  type Restaurant,
} from '../../lib/restaurants';
import { RestaurantCard } from './restaurant-card';
import { ErrorCallout } from '../../../components/callouts';

const DEFAULT_PAGE_SIZE = 12;

type RestaurantsListProps = {
  initialQuery: string;
  initialPage: number;
};

export function RestaurantsList({
  initialQuery,
  initialPage,
}: RestaurantsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = (searchParams.get('q') ?? initialQuery).trim();
  const page = toPositiveInt(searchParams.get('page')) ?? initialPage;

  const [inputValue, setInputValue] = useState(query);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page,
    page_size: DEFAULT_PAGE_SIZE,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRestaurants() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetch(
          buildRestaurantsUrl(page, DEFAULT_PAGE_SIZE, query),
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        const normalized = normalizeRestaurantsResponse(payload);

        const locallyFiltered = applyLocalFilter(normalized.data, query);

        setRestaurants(locallyFiltered);
        setPagination(normalized.pagination);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setRestaurants([]);
        setErrorMessage(
          error instanceof Error
            ? `Could not load restaurants right now (${error.message}).`
            : 'Could not load restaurants right now.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRestaurants();

    return () => controller.abort();
  }, [page, query]);

  const localFilterNotice = useMemo(() => {
    if (!query || isLoading || errorMessage) {
      return null;
    }

    if (
      restaurants.length === pagination.page_size ||
      restaurants.length === pagination.total
    ) {
      return null;
    }

    return 'Filtered locally on the current page results.';
  }, [
    errorMessage,
    isLoading,
    pagination.page_size,
    pagination.total,
    query,
    restaurants.length,
  ]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    replaceSearchParams({ q: inputValue.trim() || null, page: '1' });
  }

  function handleClearSearch() {
    setInputValue('');
    replaceSearchParams({ q: null, page: '1' });
  }

  function goToPage(nextPage: number) {
    replaceSearchParams({ page: String(nextPage) });
  }

  function replaceSearchParams(updates: Record<string, string | null>) {
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
  }

  return (
    <section className="space-y-4">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={handleSearchSubmit}
      >
        <div className="relative flex-1">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Search by name, category, city, or district"
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit">Search</Button>
          {query && (
            <Button type="button" variant="outline" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {localFilterNotice && (
        <p className="text-xs text-muted-foreground">{localFilterNotice}</p>
      )}

      {errorMessage && (
        <ErrorCallout
          message="Unable to load restaurants"
          details={errorMessage}
        />
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border/60 p-4">
              <Skeleton className="mb-3 h-4 w-2/3" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="mb-3 h-3 w-4/5" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      ) : restaurants.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>No restaurants found</EmptyTitle>
            <EmptyDescription>
              Try another keyword or clear search to browse all listings.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <span>
          Page {pagination.page} of {Math.max(1, pagination.total_pages)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={!pagination.has_previous || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={!pagination.has_next || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

function toPositiveInt(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function applyLocalFilter(items: Restaurant[], query: string): Restaurant[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

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
