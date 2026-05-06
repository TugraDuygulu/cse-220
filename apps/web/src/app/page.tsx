import Link from 'next/link';
import {
  RiArrowRightLine,
  RiMapPinLine,
  RiRestaurant2Line,
  RiSearchLine,
  RiStarFill,
  RiStarLine,
} from '@remixicon/react';
import { SearchBox } from '@flavor-map/ui-module-discovery';

import {
  buildRestaurantsUrl,
  getRestaurantCoverImage,
  normalizeRestaurantsResponse,
  type Restaurant,
} from '@/lib/restaurants';

const categories = [
  { label: 'Pizza', tone: 'bg-amber-50 text-amber-600' },
  { label: 'Breakfast', tone: 'bg-orange-50 text-orange-600' },
  { label: 'Vegan', tone: 'bg-emerald-50 text-emerald-600' },
  { label: 'Seafood', tone: 'bg-sky-50 text-sky-600' },
  { label: 'Dessert', tone: 'bg-pink-50 text-pink-600' },
];

const filters = ['Top rated', 'Open now', 'Most reviewed', 'Nearby'];

export default async function Index() {
  const restaurants = await loadFeaturedRestaurants();
  const topRated = [...restaurants]
    .sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))
    .slice(0, 3);
  const popular = restaurants.slice(0, 2);
  const totalReviews = restaurants.reduce(
    (total, restaurant) => total + (restaurant.review_count ?? 0),
    0,
  );
  const averageRating = restaurants.length
    ? restaurants.reduce(
        (total, restaurant) => total + (restaurant.average_rating ?? 0),
        0,
      ) / restaurants.length
    : 0;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,oklch(0.97_0.03_86),transparent_34rem),linear-gradient(180deg,oklch(1_0_0),oklch(0.98_0.01_89))]">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-16 pt-8 md:px-8 lg:grid-cols-[minmax(0,1.1fr)_24rem] lg:items-start lg:gap-10 lg:pt-16">
        <div className="space-y-8">
          <div className="max-w-4xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-sm text-muted-foreground shadow-sm backdrop-blur">
              <RiMapPinLine className="size-4" />
              Explore reviewed restaurants near you
            </div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                Find restaurants worth talking about.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Browse local restaurants, compare diner ratings, and read real
                reviews before choosing your next table.
              </p>
            </div>
            <SearchBox
              defaultExpanded
              placeholder="Search restaurants, cuisines, or neighborhoods"
              searchPath="/restaurants"
              className="max-w-3xl"
              expandedClassName="h-14 border-black/10 bg-white/95 text-base shadow-2xl shadow-black/10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category.label}
                href={`/restaurants?q=${encodeURIComponent(category.label)}`}
                className="group rounded-3xl border border-black/5 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <span
                  className={`mb-3 flex size-12 items-center justify-center rounded-2xl ${category.tone}`}
                >
                  <RiRestaurant2Line className="size-6" />
                </span>
                <span className="font-medium text-foreground">
                  {category.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <Link
                key={filter}
                href="/restaurants"
                className="whitespace-nowrap rounded-full border border-black/10 bg-white/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-white"
              >
                {filter}
              </Link>
            ))}
          </div>

          <DiscoverySection title="Top-rated right now" href="/restaurants">
            {topRated.length ? (
              <div className="grid gap-4 md:grid-cols-3">
                {topRated.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <EmptyRestaurantState />
            )}
          </DiscoverySection>

          <DiscoverySection title="Popular nearby" href="/restaurants">
            {popular.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {popular.map((restaurant) => (
                  <RestaurantPreview key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <EmptyRestaurantState />
            )}
          </DiscoverySection>
        </div>

        <aside className="rounded-[2rem] border border-black/10 bg-foreground p-5 text-background shadow-2xl shadow-black/20 lg:sticky lg:top-8">
          <div className="space-y-5">
            <div className="rounded-[1.5rem] bg-white/10 p-4">
              <p className="text-sm text-background/70">Restaurant discovery</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {restaurants.length
                  ? `${restaurants.length} reviewed spots`
                  : 'Start with the map'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-background/70">
                Use ratings, review counts, categories, and location context to
                pick where to eat next.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric label="Restaurants" value={String(restaurants.length)} />
              <Metric
                label="Avg rating"
                value={averageRating ? averageRating.toFixed(1) : 'N/A'}
              />
              <Metric label="Reviews" value={String(totalReviews)} />
              <Metric label="Map view" value="Live" />
            </div>
            <Link
              href="/restaurants"
              className="flex items-center justify-between rounded-full bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-background/90"
            >
              Open discovery map
              <RiArrowRightLine className="size-5" />
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

async function loadFeaturedRestaurants(): Promise<Restaurant[]> {
  try {
    const response = await fetch(buildRestaurantsUrl(1, 6), {
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return normalizeRestaurantsResponse(await response.json()).data;
  } catch {
    return [];
  }
}

function DiscoverySection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <Link
          href={href}
          aria-label={`View all ${title.toLowerCase()}`}
          className="flex size-10 items-center justify-center rounded-full bg-white text-foreground shadow-sm transition hover:translate-x-0.5 hover:shadow-md"
        >
          <RiArrowRightLine className="size-5" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={getRestaurantCoverImage(restaurant.slug)}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
          {restaurant.review_count ?? 0} reviews
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {restaurant.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {restaurant.category?.name || restaurant.district || restaurant.city ||
            'Local restaurant'}
        </p>
        <p className="flex items-center gap-1 text-sm text-foreground">
          <RiStarFill className="size-4 text-amber-500" />
          {restaurant.average_rating?.toFixed(1) ?? 'No rating'}
        </p>
      </div>
    </Link>
  );
}

function RestaurantPreview({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.slug}`}
      className="grid grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:shadow-xl"
    >
      <img
        src={getRestaurantCoverImage(restaurant.slug)}
        alt=""
        className="h-full min-h-32 w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-2 p-4">
        <h3 className="font-semibold tracking-tight text-foreground">
          {restaurant.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {[restaurant.category?.name, restaurant.city, restaurant.district]
            .filter(Boolean)
            .join(' / ') || 'Restaurant'}
        </p>
        <p className="flex items-center gap-1 text-sm font-medium text-foreground">
          <RiStarLine className="size-4 text-amber-500" />
          {restaurant.average_rating?.toFixed(1) ?? 'No rating'}
        </p>
      </div>
    </Link>
  );
}

function EmptyRestaurantState() {
  return (
    <div className="rounded-3xl border border-dashed border-black/10 bg-white/70 p-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <RiSearchLine className="size-4" />
        No restaurants loaded yet
      </div>
      <p className="mt-2">
        Open the discovery map to browse restaurants as soon as the API has
        listings.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-background/60">{label}</p>
    </div>
  );
}
