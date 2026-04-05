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

export type RestaurantsResponse = {
  data: Restaurant[];
  pagination: PaginationMeta;
};

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredBaseUrl && configuredBaseUrl.trim()) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return 'http://127.0.0.1:8000';
}

export const API_ENDPOINTS = {
  restaurants: {
    list: () => `${getApiBaseUrl()}/api/v1/restaurants/`,
    detail: (slug: string) => `${getApiBaseUrl()}/api/v1/restaurants/${slug}/`,
    create: () => `${getApiBaseUrl()}/api/v1/restaurants/`,
    update: (slug: string) => `${getApiBaseUrl()}/api/v1/restaurants/${slug}/`,
    delete: (slug: string) => `${getApiBaseUrl()}/api/v1/restaurants/${slug}/`,
  },
  auth: {
    register: () => `${getApiBaseUrl()}/api/v1/auth/register`,
    login: () => `${getApiBaseUrl()}/api/v1/auth/login`,
    me: () => `${getApiBaseUrl()}/api/v1/auth/me`,
  },
  reviews: {
    list: (restaurantSlug: string) =>
      `${getApiBaseUrl()}/api/v1/restaurants/${restaurantSlug}/reviews/`,
    create: (restaurantSlug: string) =>
      `${getApiBaseUrl()}/api/v1/restaurants/${restaurantSlug}/reviews/`,
  },
  categories: {
    list: () => `${getApiBaseUrl()}/api/v1/categories/`,
  },
} as const;

export function buildRestaurantsUrl(
  page: number,
  pageSize: number,
  query?: string,
): string {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const normalizedQuery = query?.trim();
  if (normalizedQuery) {
    params.set('search', normalizedQuery);
    params.set('q', normalizedQuery);
  }

  return `${API_ENDPOINTS.restaurants.list()}?${params.toString()}`;
}

export async function fetchRestaurantDetail(
  slug: string,
): Promise<Restaurant | null> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/restaurants/${slug}/`,
    {
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { data?: Partial<Restaurant> };
  if (!payload?.data) {
    return null;
  }

  return {
    id: payload.data.id ?? slug,
    slug,
    name: payload.data.name ?? slugToTitle(slug),
    description: payload.data.description,
    city: payload.data.city,
    district: payload.data.district,
    address_line1: payload.data.address_line1,
    website: payload.data.website,
    phone: payload.data.phone,
    average_rating: toNumber(payload.data.average_rating),
    review_count: toNumber(payload.data.review_count),
    price_range: payload.data.price_range,
    category: payload.data.category,
  };
}

export function normalizeRestaurantsResponse(
  payload: unknown,
): RestaurantsResponse {
  const fallback: RestaurantsResponse = {
    data: [],
    pagination: {
      page: 1,
      page_size: 12,
      total: 0,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    },
  };

  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const candidate = payload as {
    data?: Partial<Restaurant>[];
    pagination?: Partial<PaginationMeta>;
  };

  const normalizedData = Array.isArray(candidate.data)
    ? candidate.data
        .map((item) => normalizeRestaurant(item))
        .filter((item): item is Restaurant => item !== null)
    : [];

  const candidatePagination = candidate.pagination;
  const page = Math.max(1, toNumber(candidatePagination?.page) ?? 1);
  const pageSize = Math.max(1, toNumber(candidatePagination?.page_size) ?? 12);
  const total = Math.max(
    0,
    toNumber(candidatePagination?.total) ?? normalizedData.length,
  );
  const totalPages = Math.max(
    1,
    toNumber(candidatePagination?.total_pages) ?? 1,
  );

  return {
    data: normalizedData,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
      has_next: Boolean(candidatePagination?.has_next),
      has_previous: Boolean(candidatePagination?.has_previous),
    },
  };
}

export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

const coverImages = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1481833761820-0509d3217039?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=80',
];

export function getRestaurantCoverImage(seed: string): string {
  const hash = seededHash(seed);
  return coverImages[hash % coverImages.length];
}

export function getRestaurantDistanceKm(seed: string): number {
  const hash = seededHash(seed);
  return Math.round((((hash % 120) + 5) / 10) * 10) / 10;
}

export function getRestaurantIsOpen(seed: string): boolean {
  const hash = seededHash(seed);
  return hash % 4 !== 0;
}

function seededHash(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeRestaurant(
  candidate: Partial<Restaurant>,
): Restaurant | null {
  if (!candidate.slug || !candidate.name) {
    return null;
  }

  return {
    id: candidate.id ?? candidate.slug,
    name: candidate.name,
    slug: candidate.slug,
    description: candidate.description,
    city: candidate.city,
    district: candidate.district,
    address_line1: candidate.address_line1,
    website: candidate.website,
    phone: candidate.phone,
    average_rating: toNumber(candidate.average_rating),
    review_count: toNumber(candidate.review_count),
    price_range: candidate.price_range,
    category: candidate.category,
  };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}
