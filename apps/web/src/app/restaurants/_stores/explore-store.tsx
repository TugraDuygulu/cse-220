'use client';

import { create } from 'zustand';

export type RestaurantCategory = {
  id?: string;
  name?: string;
  slug?: string;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  district?: string;
  address_line1?: string;
  website?: string;
  phone?: string;
  average_rating?: number;
  review_count?: number;
  price_range?: string;
  category?: RestaurantCategory;
};

export type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export interface ExploreFilters {
  price: string | null;
  rating: number | null;
}

export interface ExploreViewState {
  query: string;
  inputValue: string;
  restaurants: Restaurant[];
  pagination: PaginationMeta;
  isLoading: boolean;
  errorMessage: string | null;
  filters: ExploreFilters;
  showFilters: boolean;
  hoveredId: string | null;
  showListMobile: boolean;
  setQuery: (query: string) => void;
  setInputValue: (value: string) => void;
  setRestaurants: (restaurants: Restaurant[]) => void;
  setPagination: (pagination: PaginationMeta) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (message: string | null) => void;
  setPriceFilter: (price: string | null) => void;
  setRatingFilter: (rating: number | null) => void;
  toggleFilters: () => void;
  clearAllFilters: () => void;
  setHoveredId: (id: string | null) => void;
  toggleListMobile: () => void;
}

const DEFAULT_PAGE_SIZE = 12;

const createDefaultPagination = (page: number): PaginationMeta => ({
  page,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
});

export const useExploreStore = create<ExploreViewState>((set) => ({
  query: '',
  inputValue: '',
  restaurants: [],
  pagination: createDefaultPagination(1),
  isLoading: false,
  errorMessage: null,
  filters: { price: null, rating: null },
  showFilters: false,
  hoveredId: null,
  showListMobile: true,

  setQuery: (query) => set({ query }),
  setInputValue: (inputValue) => set({ inputValue }),
  setRestaurants: (restaurants) => set({ restaurants }),
  setPagination: (pagination) => set({ pagination }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),

  setPriceFilter: (price) =>
    set((state) => ({ filters: { ...state.filters, price } })),
  setRatingFilter: (rating) =>
    set((state) => ({ filters: { ...state.filters, rating } })),
  toggleFilters: () => set((state) => ({ showFilters: !state.showFilters })),
  clearAllFilters: () => set({ filters: { price: null, rating: null } }),

  setHoveredId: (hoveredId) => set({ hoveredId }),
  toggleListMobile: () =>
    set((state) => ({ showListMobile: !state.showListMobile })),
}));

export const useExploreRestaurants = () =>
  useExploreStore((s) => s.restaurants);
export const useExploreFilters = () => useExploreStore((s) => s.filters);
export const useExploreLoading = () => useExploreStore((s) => s.isLoading);
export const useExploreError = () => useExploreStore((s) => s.errorMessage);
export const useExplorePagination = () => useExploreStore((s) => s.pagination);

export const useExploreUI = () => {
  const hoveredId = useExploreStore((s) => s.hoveredId);
  const showFilters = useExploreStore((s) => s.showFilters);
  const showListMobile = useExploreStore((s) => s.showListMobile);
  return { hoveredId, showFilters, showListMobile };
};
