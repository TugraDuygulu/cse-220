'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, CardContent, Textarea } from 'ui-common';
import {
  RiChatSmileLine,
  RiCloseLine,
  RiStarFill,
  RiStarLine,
  RiThumbDownLine,
  RiThumbUpLine,
} from '@remixicon/react';

import type { Review } from '@/lib/reviews';
import {
  fetchRestaurantReviews,
  reactToReview,
  submitReview,
  type ReviewReaction,
} from '@/lib/reviews';

const REVIEW_PAGE_SIZE = 10;

function formatError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (
    normalized.includes('authentication') ||
    normalized.includes('sign in') ||
    normalized.includes('login')
  ) {
    return 'Sign in to post reviews, comments, and reactions.';
  }

  return message;
}

type ReviewSectionProps = {
  restaurantSlug: string;
  restaurantName: string;
  initialReviews: Review[];
  totalReviews: number;
};

export function ReviewSection({
  restaurantSlug,
  restaurantName,
  initialReviews,
  totalReviews,
}: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reviewTotal, setReviewTotal] = useState(totalReviews);
  const [hasMore, setHasMore] = useState(initialReviews.length < totalReviews);
  const [nextPage, setNextPage] = useState(2);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>(
    {},
  );

  const ratingLabel =
    rating <= 0
      ? 'Select a rating'
      : rating <= 2
        ? 'Needs improvement'
        : rating === 3
          ? 'Good overall'
          : 'Excellent experience';

  async function loadMoreReviews() {
    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await fetchRestaurantReviews(
        restaurantSlug,
        nextPage,
        REVIEW_PAGE_SIZE,
      );

      setReviews((current) => [...current, ...response.data]);
      setReviewTotal(response.pagination.total);
      setHasMore(response.pagination.has_next);
      setNextPage(response.pagination.page + 1);
    } catch {
      setLoadMoreError('Could not load more reviews right now.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: { rating?: string; comment?: string } = {};
    if (rating < 1) nextErrors.rating = 'Please choose a rating.';
    if (comment.trim().length < 20)
      nextErrors.comment = 'Please write at least 20 characters.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await submitReview(restaurantSlug, rating, comment.trim());

    if (result.success) {
      setSubmitSuccess(true);
      if (result.review) {
      setReviews((prev) => [result.review as Review, ...prev]);
      setReviewTotal((current) => current + 1);
      }
      setRating(0);
      setComment('');
      setShowForm(false);
    } else {
      setSubmitError(formatError(result.error, 'Failed to submit review.'));
    }

    setIsSubmitting(false);
  }

  function resetForm() {
    setShowForm(false);
    setRating(0);
    setComment('');
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            {reviewTotal} review{reviewTotal !== 1 ? 's' : ''} from diners
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-1.5">
            <RiChatSmileLine className="size-4" />
            Write a review
          </Button>
        )}
      </div>

      {submitSuccess && (
        <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex items-center justify-between py-3">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Review submitted successfully!
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmitSuccess(false)}
              aria-label="Dismiss success message"
            >
              <RiCloseLine className="size-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Your rating</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const score = i + 1;
                    return (
                      <button
                        key={score}
                        type="button"
                        aria-label={`Rate ${score} star${score === 1 ? '' : 's'}`}
                        onClick={() => setRating(score)}
                        className="rounded p-0.5 transition-colors hover:text-amber-500"
                      >
                        {score <= rating ? (
                          <RiStarFill className="size-5 text-amber-500" />
                        ) : (
                          <RiStarLine className="size-5" />
                        )}
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {ratingLabel}
                  </span>
                </div>
              </div>
              {errors.rating && (
                <p className="text-xs text-destructive">{errors.rating}</p>
              )}

              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={`Share your experience at ${restaurantName}...`}
                className="min-h-28 text-sm"
              />
              {errors.comment && (
                <p className="text-xs text-destructive">{errors.comment}</p>
              )}

              {submitError && (
                <div className="space-y-2">
                  <p className="text-xs text-destructive">{submitError}</p>
                  {submitError.startsWith('Sign in') && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/auth/sign-in">Sign in</Link>
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || rating < 1}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit review'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              restaurantSlug={restaurantSlug}
              onReply={(parentId, reply) => {
                setReviews((prev) =>
                  prev.map((item) =>
                    item.id === parentId
                      ? { ...item, replies: [...(item.replies ?? []), reply] }
                      : item,
                  ),
                );
              }}
            />
          ))}
          {hasMore && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void loadMoreReviews()}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading more...' : 'Load more reviews'}
              </Button>
              {loadMoreError && (
                <p className="text-xs text-destructive">{loadMoreError}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No reviews yet. Be the first to share your experience!
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              Write the first review
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  restaurantSlug,
  onReply,
}: {
  review: Review;
  restaurantSlug: string;
  onReply: (parentId: string, reply: Review) => void;
}) {
  const [reaction, setReaction] = useState<ReviewReaction | null>(null);
  const [likeCount, setLikeCount] = useState(review.like_count);
  const [dislikeCount, setDislikeCount] = useState(review.dislike_count);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const date = new Date(review.created_at);
  const timeAgo = getTimeAgo(date);

  async function handleReaction(nextReaction: ReviewReaction) {
    setReactionError(null);

    const previousReaction = reaction;
    const remove = previousReaction === nextReaction;
    const result = await reactToReview(review.id, nextReaction, remove);

    if (!result.success) {
      setReactionError(formatError(result.error, 'Could not update reaction.'));
      return;
    }

    setReaction(result.user_reaction ?? null);
    setLikeCount(result.like_count ?? likeCount);
    setDislikeCount(result.dislike_count ?? dislikeCount);
  }

  async function handleReplySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = replyContent.trim();
    if (content.length < 3) {
      setReplyError('Please write a reply before submitting.');
      return;
    }

    setIsReplying(true);
    setReplyError(null);
    const result = await submitReview(
      restaurantSlug,
      review.rating,
      content,
      review.id,
    );

    if (result.success && result.review) {
      onReply(review.id, result.review);
      setReplyContent('');
      setShowReplyForm(false);
    } else {
      setReplyError(formatError(result.error, 'Failed to post reply.'));
    }

    setIsReplying(false);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {review.user.display_name[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {review.user.display_name}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
              {review.is_business_answer && (
                <Badge variant="outline" className="text-[10px]">
                  Official business answer
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <RiStarFill
                  key={i}
                  className={`size-3.5 ${i < review.rating ? 'text-amber-500' : 'text-muted'}`}
                />
              ))}
              <Badge variant="secondary" className="ml-1 text-xs">
                {review.rating}/5
              </Badge>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {review.content}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            aria-label={`Like review from ${review.user.display_name}`}
            onClick={() => void handleReaction('like')}
            className={`inline-flex items-center gap-1 text-xs transition-colors ${
              reaction === 'like'
                ? 'text-green-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RiThumbUpLine className="size-4" />
            {likeCount}
          </button>
          <button
            type="button"
            aria-label={`Dislike review from ${review.user.display_name}`}
            onClick={() => void handleReaction('dislike')}
            className={`inline-flex items-center gap-1 text-xs transition-colors ${
              reaction === 'dislike'
                ? 'text-red-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RiThumbDownLine className="size-4" />
            {dislikeCount}
          </button>
          <button
            type="button"
            onClick={() => setShowReplyForm((value) => !value)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Reply
          </button>
        </div>

        {reactionError && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-destructive">{reactionError}</p>
            {reactionError.startsWith('Sign in') && (
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        )}

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(event) => setReplyContent(event.target.value)}
              placeholder="Add a comment..."
              className="min-h-20 text-sm"
            />
            {replyError && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">{replyError}</p>
                {replyError.startsWith('Sign in') && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/auth/sign-in">Sign in</Link>
                  </Button>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReplyForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isReplying}>
                {isReplying ? 'Posting...' : 'Post comment'}
              </Button>
            </div>
          </form>
        )}

        {review.replies?.map((reply) => (
          <div
            key={reply.id}
            className={`mt-3 ml-4 border-l-2 pl-3 ${
              reply.is_business_answer
                ? 'border-primary bg-primary/5 py-2 pr-2'
                : 'border-border'
            }`}
          >
            <p className="text-xs font-medium">
              {reply.user.display_name}
              {reply.is_business_answer && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  Owner reply
                </Badge>
              )}
              <span className="ml-1 font-normal text-muted-foreground">
                replied {getTimeAgo(new Date(reply.created_at))}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {reply.content}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
