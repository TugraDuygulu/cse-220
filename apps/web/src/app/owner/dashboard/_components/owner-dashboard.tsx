'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Input,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from 'ui-common';
import {
  RiAddCircleLine,
  RiArrowRightLine,
  RiBarChart2Line,
  RiCalendarLine,
  RiChat3Line,
  RiDashboardLine,
  RiFileList3Line,
  RiImageLine,
  RiMapPinLine,
  RiPencilLine,
  RiPhoneLine,
  RiRestaurantLine,
  RiStarLine,
  RiStore2Line,
  RiTimeLine,
  RiUser3Line,
} from '@remixicon/react';

import { sessionRequest } from '@/app/(auth)/auth/_lib/auth-api';
import {
  API_ENDPOINTS,
  type Restaurant,
  type RestaurantCategory,
  type User,
} from '@/lib/restaurants';
import {
  fetchRestaurantReviews,
  submitReview,
  type Review,
} from '@/lib/reviews';
import {
  buildRestaurantWritePayload,
  emptyRestaurantFormValues,
  restaurantToFormValues,
  type RestaurantFormValues,
} from '../_lib/owner-dashboard-utils';

type LoadState = 'loading' | 'ready' | 'access-denied' | 'error';

export function OwnerDashboard() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [formValues, setFormValues] = useState<RestaurantFormValues>(() =>
    emptyRestaurantFormValues(),
  );
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoadState('loading');
      setError(null);

      try {
        const currentUser = await sessionRequest<User>(API_ENDPOINTS.auth.me());

        if (ignore) {
          return;
        }

        setUser(currentUser);
        if (currentUser.role !== 'owner') {
          setLoadState('access-denied');
          return;
        }

        const [ownedRestaurants, categoryList] = await Promise.all([
          sessionRequest<Restaurant[]>(API_ENDPOINTS.restaurants.mine()),
          sessionRequest<RestaurantCategory[]>(API_ENDPOINTS.categories.list()),
        ]);

        if (ignore) {
          return;
        }

        setRestaurants(ownedRestaurants);
        setCategories(categoryList.filter((category) => category.id));
        setFormValues((current) => ({
          ...current,
          categoryId: current.categoryId || categoryList[0]?.id || '',
        }));
        setLoadState('ready');
      } catch (caught) {
        if (ignore) {
          return;
        }
        setError(caught instanceof Error ? caught.message : 'Unable to load dashboard.');
        setLoadState('error');
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildRestaurantWritePayload(formValues);
      const savedRestaurant = editingSlug
        ? await sessionRequest<Restaurant>(API_ENDPOINTS.restaurants.update(editingSlug), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await sessionRequest<Restaurant>(API_ENDPOINTS.restaurants.create(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      setRestaurants((current) => {
        if (!editingSlug) {
          return [savedRestaurant, ...current];
        }

        return current.map((restaurant) =>
          restaurant.slug === editingSlug ? savedRestaurant : restaurant,
        );
      });
      setEditingSlug(null);
      setFormValues({
        ...emptyRestaurantFormValues(),
        categoryId: categories[0]?.id ?? '',
      });
      setMessage(editingSlug ? 'Listing updated.' : 'Listing created.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save listing.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateField<K extends keyof RestaurantFormValues>(
    field: K,
    value: RestaurantFormValues[K],
  ) {
    setFormValues((current) => ({ ...current, [field]: value }));
  }

  function editRestaurant(restaurant: Restaurant) {
    setEditingSlug(restaurant.slug);
    setFormValues(restaurantToFormValues(restaurant));
    setError(null);
    setMessage(null);
  }

  function resetForm() {
    setEditingSlug(null);
    setFormValues({
      ...emptyRestaurantFormValues(),
      categoryId: categories[0]?.id ?? '',
    });
    setError(null);
    setMessage(null);
  }

  if (loadState === 'loading') {
    return <DashboardShell title="Loading dashboard" description="Fetching your owner workspace." />;
  }

  if (loadState === 'access-denied') {
    return (
      <DashboardShell
        title="Business access required"
        description="Sign in with a restaurant owner account to manage listings."
      >
        <Button asChild>
          <Link href="/business/sign-in" className="inline-flex items-center gap-1">
            Open business sign in
            <RiArrowRightLine className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </DashboardShell>
    );
  }

  if (loadState === 'error') {
    return (
      <DashboardShell
        title="Dashboard unavailable"
        description={error ?? 'Unable to load dashboard.'}
      />
    );
  }

  const totalReviews = restaurants.reduce(
    (total, restaurant) => total + toNonNegativeInt(restaurant.review_count),
    0,
  );
  const weightedRating = totalReviews
    ? restaurants.reduce(
        (total, restaurant) => {
          const reviewCount = toNonNegativeInt(restaurant.review_count);
          if (!reviewCount) {
            return total;
          }

          return total + (toFiniteNumber(restaurant.average_rating) ?? 0) * reviewCount;
        },
        0,
      ) / totalReviews
    : 0;

  const activeRestaurant = editingSlug
    ? restaurants.find((restaurant) => restaurant.slug === editingSlug)
    : restaurants[0];
  const detailRestaurant = activeRestaurant ?? restaurants[0];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[72px_minmax(0,1fr)]">
        <SidebarNav />

        <div className="min-w-0 border-l border-border/70 bg-background">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur sm:px-8">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Open public listings">
              <Link href="/restaurants">
                <RiArrowRightLine className="size-4 rotate-180" aria-hidden="true" />
              </Link>
            </Button>
            <span className="text-sm font-medium text-muted-foreground">Restaurants</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-sm font-semibold">Owner workspace</span>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
            <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15 sm:size-24">
                  <RiStore2Line className="size-10" aria-hidden="true" />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                      {detailRestaurant?.name || user?.display_name || 'Restaurant profile'}
                    </h1>
                    <Badge variant="secondary">Owner dashboard</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-medium text-muted-foreground">
                    <ProfileAction icon={<RiChat3Line className="size-4" />} label="Start a conversation" />
                    <ProfileAction icon={<RiCalendarLine className="size-4" />} label="Schedule reminder" />
                    <ProfileAction icon={<RiFileList3Line className="size-4" />} label="Add a note" />
                    <ProfileAction icon={<RiPhoneLine className="size-4" />} label="Call restaurant" />
                  </div>
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/restaurants" className="inline-flex items-center gap-1">
                  View public listings
                  <RiArrowRightLine className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>

            <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <Card className="border-border/80 bg-card shadow-sm">
                  <CardHeader className="border-b border-border/70">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <RiStore2Line className="size-4 text-muted-foreground" aria-hidden="true" />
                        Restaurant details
                      </CardTitle>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Create listing" onClick={resetForm}>
                        <RiAddCircleLine className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/70 px-0">
                    <div className="space-y-4 px-5 py-4">
                      <DetailRow label="Restaurant name" value={detailRestaurant?.name || 'Not created yet'} />
                      <DetailRow label="Category" value={detailRestaurant?.category?.name || 'Select category'} />
                      <DetailRow label="City" value={detailRestaurant?.city || formValues.city || 'Istanbul'} />
                      <DetailRow label="District" value={detailRestaurant?.district || formValues.district || 'Not set'} />
                    </div>
                    <div className="space-y-4 px-5 py-4">
                      <DetailRow label="Rating" value={totalReviews ? weightedRating.toFixed(1) : 'No reviews'} />
                      <DetailRow label="Reviews" value={String(totalReviews)} />
                      <DetailRow label="Owned listings" value={String(restaurants.length)} />
                    </div>
                    <div className="space-y-4 px-5 py-4">
                      <DetailRow label="Phone" value={detailRestaurant?.phone || formValues.phone || 'Add phone'} />
                      <DetailRow label="Website" value={detailRestaurant?.website || formValues.website || 'Add website'} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/80 bg-card shadow-sm">
                  <CardHeader className="border-b border-border/70">
                    <CardTitle className="flex items-center gap-2">
                      <RiUser3Line className="size-4 text-muted-foreground" aria-hidden="true" />
                      Owner contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <DetailRow label="Name" value={user?.display_name || 'Restaurant owner'} />
                    <DetailRow label="Email" value={user?.email || 'Signed in'} />
                    <DetailRow label="Role" value="Owner" />
                  </CardContent>
                </Card>
              </aside>

              <div className="min-w-0 space-y-5">
                <ActivityTabs />

                <section className="grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    icon={<RiStore2Line className="size-4" aria-hidden="true" />}
                    label="Owned listings"
                    value={String(restaurants.length)}
                  />
                  <MetricCard
                    icon={<RiStarLine className="size-4" aria-hidden="true" />}
                    label="Average rating"
                    value={totalReviews ? weightedRating.toFixed(1) : 'No reviews'}
                  />
                  <MetricCard
                    icon={<RiBarChart2Line className="size-4" aria-hidden="true" />}
                    label="Review count"
                    value={String(totalReviews)}
                  />
                </section>

                <section className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]">
        <Card className="border border-border/70 bg-card shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>{editingSlug ? 'Edit listing' : 'Create a listing'}</CardTitle>
            <CardDescription>
              {editingSlug
                ? 'Update core details for the selected restaurant.'
                : restaurants.length
                  ? 'Add another restaurant under your owner account.'
                  : 'Create your first listing to make your restaurant visible.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <TextField
                id="restaurant-name"
                label="Restaurant name"
                value={formValues.name}
                onChange={(value) => updateField('name', value)}
                placeholder="Ada Bistro"
                disabled={isSubmitting}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="restaurant-category" className="text-xs font-medium">
                    Category
                  </label>
                  <NativeSelect
                    id="restaurant-category"
                    value={formValues.categoryId}
                    onChange={(event) => updateField('categoryId', event.target.value)}
                    required
                    disabled={isSubmitting || categories.length === 0}
                    className="w-full"
                  >
                    <NativeSelectOption value="" disabled>
                      Select category
                    </NativeSelectOption>
                    {categories.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <label htmlFor="price-range" className="text-xs font-medium">
                    Price range
                  </label>
                  <NativeSelect
                    id="price-range"
                    value={formValues.priceRange}
                    onChange={(event) => updateField('priceRange', event.target.value)}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <NativeSelectOption value="1">Low</NativeSelectOption>
                    <NativeSelectOption value="2">Medium</NativeSelectOption>
                    <NativeSelectOption value="3">High</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="restaurant-description" className="text-xs font-medium">
                  Description
                </label>
                <Textarea
                  id="restaurant-description"
                  value={formValues.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Describe the food, atmosphere, and what makes this place worth visiting."
                  required
                  disabled={isSubmitting}
                  className="min-h-24"
                />
              </div>

              <TextField
                id="address-line-1"
                label="Street address"
                value={formValues.addressLine1}
                onChange={(value) => updateField('addressLine1', value)}
                placeholder="Main Street 1"
                disabled={isSubmitting}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="city"
                  label="City"
                  value={formValues.city}
                  onChange={(value) => updateField('city', value)}
                  placeholder="Istanbul"
                  disabled={isSubmitting}
                  required
                />
                <TextField
                  id="district"
                  label="District"
                  value={formValues.district}
                  onChange={(value) => updateField('district', value)}
                  placeholder="Kadikoy"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="phone"
                  label="Phone"
                  value={formValues.phone}
                  onChange={(value) => updateField('phone', value)}
                  placeholder="+90 555 0101"
                  disabled={isSubmitting}
                />
                <TextField
                  id="website"
                  label="Website"
                  type="url"
                  value={formValues.website}
                  onChange={(value) => updateField('website', value)}
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                />
              </div>

              {message && (
                <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                  {message}
                </p>
              )}
              {error && (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSubmitting || categories.length === 0}>
                  {isSubmitting
                    ? 'Saving...'
                    : editingSlug
                      ? 'Update listing'
                      : 'Create listing'}
                </Button>
                {editingSlug && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Owned listings</CardTitle>
              <CardDescription>
                Read and edit restaurants attached to this owner account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {restaurants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No restaurants yet. Create your first listing with the form.
                </div>
              ) : (
                restaurants.map((restaurant) => (
                  <article
                    key={restaurant.id}
                    className="rounded-lg border border-border/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-sm font-medium">
                          {restaurant.name}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {[restaurant.category?.name, restaurant.city, restaurant.district]
                            .filter(Boolean)
                            .join(' / ')}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editRestaurant(restaurant)}
                      >
                        <RiPencilLine className="size-3" aria-hidden="true" />
                        Edit
                      </Button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Rating: {formatRating(restaurant.average_rating)}</span>
                      <span>Reviews: {formatReviewCount(restaurant.review_count)}</span>
                    </div>
                  </article>
                ))
              )}
            </CardContent>
          </Card>

          <OwnerReviewReplies restaurant={detailRestaurant ?? null} />

          <Card className="border border-border/70 bg-card/70 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle>Coming next</CardTitle>
              <CardDescription>
                These actions stay disabled until matching backend APIs are available.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <DisabledAction
                icon={<RiRestaurantLine className="size-4" aria-hidden="true" />}
                label="Menu editor"
              />
              <DisabledAction
                icon={<RiImageLine className="size-4" aria-hidden="true" />}
                label="Photo uploads"
              />
              <DisabledAction
                icon={<RiTimeLine className="size-4" aria-hidden="true" />}
                label="Opening hours"
              />
              <DisabledAction
                icon={<RiStarLine className="size-4" aria-hidden="true" />}
                label="Review analytics"
              />
            </CardContent>
          </Card>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function OwnerReviewReplies({ restaurant }: { restaurant: Restaurant | null }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!restaurant) {
      setReviews([]);
      return;
    }

    const selectedRestaurant = restaurant;
    let ignore = false;

    async function loadReviews() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchRestaurantReviews(selectedRestaurant.slug, 1, 5);
        if (!ignore) {
          setReviews(response.data);
        }
      } catch {
        if (!ignore) {
          setError('Unable to load recent reviews.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadReviews();
    return () => {
      ignore = true;
    };
  }, [restaurant]);

  async function submitReply(review: Review) {
    if (!restaurant) return;

    const content = (replyDrafts[review.id] ?? '').trim();
    if (!content) {
      setError('Write a reply before sending.');
      return;
    }

    setSubmittingId(review.id);
    setError(null);
    setMessage(null);

    const result = await submitReview(
      restaurant.slug,
      review.rating,
      content,
      review.id,
    );

    if (result.success && result.review) {
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? { ...item, replies: [...(item.replies ?? []), result.review as Review] }
            : item,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [review.id]: '' }));
      setMessage('Reply posted.');
    } else {
      setError(result.error || 'Unable to post reply.');
    }

    setSubmittingId(null);
  }

  const openReviews = reviews.filter(
    (review) => !review.replies?.some((reply) => reply.is_business_answer),
  );

  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle>Review replies</CardTitle>
        <CardDescription>
          Respond to recent diner reviews for the selected restaurant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!restaurant ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Create or select a restaurant before replying to reviews.
          </div>
        ) : isLoading ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            Loading recent reviews...
          </div>
        ) : openReviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No unreplied reviews right now.
          </div>
        ) : (
          openReviews.map((review) => (
            <article key={review.id} className="space-y-3 rounded-lg border border-border/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{review.user.display_name}</p>
                  <p className="text-xs text-muted-foreground">{review.content}</p>
                </div>
                <Badge variant="secondary">{review.rating}/5</Badge>
              </div>
              <Textarea
                value={replyDrafts[review.id] ?? ''}
                onChange={(event) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [review.id]: event.target.value,
                  }))
                }
                placeholder="Write an owner reply..."
                className="min-h-20 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={submittingId === review.id}
                  onClick={() => void submitReply(review)}
                >
                  {submittingId === review.id ? 'Posting...' : 'Post reply'}
                </Button>
              </div>
            </article>
          ))
        )}
        {message && <p className="text-xs text-primary">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function DashboardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full border border-border/70">
        <CardHeader className="space-y-2">
          <Badge variant="secondary">Owner dashboard</Badge>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
      </Card>
    </main>
  );
}

function SidebarNav() {
  const items = [
    { label: 'Overview', icon: <RiDashboardLine className="size-5" aria-hidden="true" />, active: true },
    { label: 'Listings', icon: <RiStore2Line className="size-5" aria-hidden="true" /> },
    { label: 'Menu', icon: <RiRestaurantLine className="size-5" aria-hidden="true" /> },
    { label: 'Hours', icon: <RiTimeLine className="size-5" aria-hidden="true" /> },
    { label: 'Location', icon: <RiMapPinLine className="size-5" aria-hidden="true" /> },
    { label: 'Reviews', icon: <RiStarLine className="size-5" aria-hidden="true" /> },
    { label: 'Analytics', icon: <RiBarChart2Line className="size-5" aria-hidden="true" /> },
  ];

  return (
    <aside className="hidden min-h-screen border-r border-border/70 bg-card md:block">
      <div className="flex h-16 items-center justify-center border-b border-border/70">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
          <RiRestaurantLine className="size-5" aria-hidden="true" />
        </span>
      </div>
      <nav className="flex flex-col items-center gap-3 py-5" aria-label="Owner workspace">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            disabled={!item.active}
            className={cn(
              'flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors',
              item.active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-55',
            )}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function ProfileAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-semibold text-foreground">{value}</span>
    </div>
  );
}

function ActivityTabs() {
  const tabs = ['Overview', 'Activity', 'Menu', 'Schedule', 'Open hours', 'Reviews'];

  return (
    <div className="border-b border-border/80">
      <div className="flex gap-6 overflow-x-auto">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            disabled={index > 1}
            className={cn(
              'inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-semibold transition-colors',
              index === 1
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground',
              index > 1 && 'cursor-not-allowed opacity-55',
            )}
          >
            {tab === 'Overview' && <RiFileList3Line className="size-4" aria-hidden="true" />}
            {tab === 'Activity' && <RiCalendarLine className="size-4" aria-hidden="true" />}
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border border-border/70 bg-card/90 shadow-sm backdrop-blur" size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span>
          <span className="block text-[0.7rem] text-muted-foreground">{label}</span>
          <span className="text-lg font-semibold tracking-tight">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}

function DisabledAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-left text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-70"
    >
      {icon}
      {label}
    </button>
  );
}

function formatRating(value: unknown): string {
  const rating = toFiniteNumber(value);
  return rating === undefined ? 'No reviews' : rating.toFixed(1);
}

function formatReviewCount(value: unknown): string {
  return String(toNonNegativeInt(value));
}

function toNonNegativeInt(value: unknown): number {
  const numeric = toFiniteNumber(value);
  if (numeric === undefined) {
    return 0;
  }

  return Math.max(0, Math.floor(numeric));
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
