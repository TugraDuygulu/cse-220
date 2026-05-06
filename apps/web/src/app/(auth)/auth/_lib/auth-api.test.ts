import { afterEach, describe, expect, it, vi } from 'vitest';

import { API_ENDPOINTS } from '@/lib/restaurants';
import { sessionRequest } from './auth-api';

describe('session API helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds CSRF and credentials to unsafe session requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { csrf_token: 'csrf-123' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      sessionRequest<{ ok: boolean }>('http://localhost:8020/api/example/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ada Bistro' }),
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenNthCalledWith(1, API_ENDPOINTS.auth.csrf(), {
      credentials: 'include',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8020/api/example/',
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
      }),
    );

    const requestOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect((requestOptions.headers as Headers).get('X-CSRFToken')).toBe('csrf-123');
    expect((requestOptions.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('normalizes API errors from failed responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Authentication is required.' } }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(sessionRequest('/api/private/')).rejects.toThrow(
      'Authentication is required.',
    );
  });
});
