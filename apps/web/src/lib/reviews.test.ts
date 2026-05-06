import { afterEach, describe, expect, it, vi } from 'vitest';

const { sessionRequestMock } = vi.hoisted(() => ({
  sessionRequestMock: vi.fn(),
}));

vi.mock('@/app/(auth)/auth/_lib/auth-api', () => ({
  sessionRequest: sessionRequestMock,
}));

import {
  normalizeReviewThreads,
  reactToReview,
  submitReview,
} from './reviews';

afterEach(() => {
  vi.restoreAllMocks();
  sessionRequestMock.mockReset();
});

describe('review thread normalization', () => {
  it('normalizes empty review payloads with pagination defaults', () => {
    expect(normalizeReviewThreads({}, 2, 5)).toEqual({
      data: [],
      pagination: {
        page: 2,
        page_size: 5,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      },
    });
  });

  it('normalizes comments, business answers, counts, and missing optional fields', () => {
    const normalized = normalizeReviewThreads(
      {
        data: [
          {
            id: 'review-1',
            user: { id: 'user-1', username: 'ada' },
            rating: 5,
            content: 'Excellent mezze and service.',
            like_count: 3,
            replies: [
              {
                id: 'comment-1',
                parent_id: 'review-1',
                user: {
                  id: 'user-2',
                  display_name: 'Grace',
                  username: 'grace',
                },
                content: 'The service was great for us too.',
                created_at: '2026-01-01T12:00:00Z',
              },
              {
                id: 'answer-1',
                parent_id: 'review-1',
                user: {
                  id: 'owner-1',
                  display_name: 'Ada Bistro',
                  username: 'ada-bistro',
                },
                content: 'Thank you for visiting.',
                is_business_answer: true,
              },
            ],
          },
        ],
        pagination: { page: 1, page_size: 10, total: 1, total_pages: 1 },
      },
      1,
      10,
    );

    expect(normalized.pagination).toMatchObject({
      page: 1,
      page_size: 10,
      total: 1,
    });
    expect(normalized.data).toHaveLength(1);
    expect(normalized.data[0]).toMatchObject({
      id: 'review-1',
      rating: 5,
      content: 'Excellent mezze and service.',
      like_count: 3,
      dislike_count: 0,
      is_business_answer: false,
      user: { id: 'user-1', username: 'ada', display_name: 'ada' },
    });
    expect(normalized.data[0].replies).toEqual([
      expect.objectContaining({
        id: 'comment-1',
        parent_id: 'review-1',
        rating: 0,
        is_business_answer: false,
      }),
      expect.objectContaining({
        id: 'answer-1',
        parent_id: 'review-1',
        rating: 0,
        is_business_answer: true,
      }),
    ]);
  });

  it('drops malformed reviews while preserving valid fallback pagination', () => {
    const normalized = normalizeReviewThreads(
      {
        data: [
          { id: '', rating: 5 },
          {
            id: 'review-2',
            user: { id: 'user-2', username: 'lin' },
            rating: 4,
          },
        ],
        pagination: { total: 2 },
      },
      3,
      7,
    );

    expect(normalized.data.map((review) => review.id)).toEqual(['review-2']);
    expect(normalized.pagination).toMatchObject({
      page: 3,
      page_size: 7,
      total: 2,
      total_pages: 1,
      has_next: false,
      has_previous: false,
    });
  });

  it('returns the created review from restaurant-scoped review submission', async () => {
    sessionRequestMock.mockResolvedValueOnce({
      id: 'review-3',
      user: { id: 'user-3', username: 'mira' },
      rating: 4,
      content: 'Warm staff and a very good dinner.',
    });

    const result = await submitReview(
      'ada-bistro',
      4,
      'Warm staff and a very good dinner.',
    );

    expect(result).toMatchObject({
      success: true,
        review: {
          id: 'review-3',
          rating: 4,
          user: { display_name: 'mira' },
        },
      });
    expect(sessionRequestMock).toHaveBeenCalledWith(
      'http://localhost:8020/api/v1/restaurants/ada-bistro/reviews/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          rating: 4,
          content: 'Warm staff and a very good dinner.',
        }),
      }),
    );
  });

  it('can submit one-level comments through the same restaurant-scoped contract', async () => {
    sessionRequestMock.mockResolvedValueOnce({
      id: 'reply-1',
      parent_id: 'review-1',
      user: { id: 'owner-1', username: 'owner' },
      rating: 5,
      content: 'Thanks for visiting.',
      is_business_answer: true,
    });

    const result = await submitReview(
      'ada-bistro',
      5,
      'Thanks for visiting.',
      'review-1',
    );

    expect(result).toMatchObject({
      success: true,
        review: {
          id: 'reply-1',
          parent_id: 'review-1',
          is_business_answer: true,
        },
      });
    expect(sessionRequestMock).toHaveBeenCalledWith(
      'http://localhost:8020/api/v1/restaurants/ada-bistro/reviews/',
      expect.objectContaining({
        body: JSON.stringify({
          rating: 5,
          content: 'Thanks for visiting.',
          parent_id: 'review-1',
        }),
      }),
    );
  });

  it('posts review reactions to the review-scoped reaction endpoint', async () => {
    sessionRequestMock.mockResolvedValueOnce({
      like_count: 2,
      dislike_count: 0,
      user_reaction: 'like',
    });

    await expect(reactToReview('review-1', 'like')).resolves.toEqual({
      success: true,
      like_count: 2,
      dislike_count: 0,
      user_reaction: 'like',
    });
    expect(sessionRequestMock).toHaveBeenCalledWith(
      'http://localhost:8020/api/v1/reviews/review-1/like/',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
