import { describe, expect, it } from 'vitest';

import {
  buildRegisterPayload,
  destinationForRole,
  getCookieValue,
  normalizeApiError,
  roleForAuthVariant,
  usernameFromEmail,
} from './auth-flow';
import { getApiBaseUrl } from '@/lib/restaurants';

describe('auth-flow utilities', () => {
  it('routes owners to the restaurant dashboard', () => {
    expect(destinationForRole('owner')).toBe('/owner/dashboard');
  });

  it('routes normal users to restaurant discovery', () => {
    expect(destinationForRole('user')).toBe('/restaurants');
    expect(destinationForRole('reviewer')).toBe('/restaurants');
    expect(destinationForRole(undefined)).toBe('/restaurants');
  });

  it('maps customized auth variants to backend roles', () => {
    expect(roleForAuthVariant('business')).toBe('owner');
    expect(roleForAuthVariant('reviewer')).toBe('user');
  });

  it('reads a named cookie from a cookie header', () => {
    expect(getCookieValue('theme=dark; csrftoken=abc123; sessionid=xyz', 'csrftoken')).toBe(
      'abc123',
    );
  });

  it('normalizes API error payloads', () => {
    expect(normalizeApiError({ error: { message: 'Invalid email' } })).toBe('Invalid email');
    expect(normalizeApiError(null)).toBe('Something went wrong. Please try again.');
  });

  it('builds a backend registration payload for customized auth pages', () => {
    expect(
      buildRegisterPayload({
        email: 'OWNER@Example.com ',
        password: 'password-123',
        displayName: '  Ada Bistro  ',
        variant: 'business',
      }),
    ).toEqual({
      email: 'owner@example.com',
      username: 'owner',
      password: 'password-123',
      display_name: 'Ada Bistro',
      role: 'owner',
    });
  });

  it('creates stable fallback usernames from email addresses', () => {
    expect(usernameFromEmail('Jane.Food+reviews@example.com')).toBe('jane.food-reviews');
    expect(usernameFromEmail('not-an-email')).toBe('not-an-email');
    expect(usernameFromEmail('!!!@example.com')).toBe('flavormap-user');
  });

  it('uses the browser host for localhost API URLs during LAN development', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { location: { hostname: '192.168.1.118' } },
      configurable: true,
    });

    try {
      expect(getApiBaseUrl()).toBe('http://192.168.1.118:8020');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      });
    }
  });
});
