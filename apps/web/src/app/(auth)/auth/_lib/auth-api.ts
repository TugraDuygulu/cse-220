import { API_ENDPOINTS, type User } from '@/lib/restaurants';
import { normalizeApiError, type RegisterPayload } from './auth-flow';

interface ApiEnvelope<T> {
  data?: T;
  error?: { message?: string };
}

interface LoginPayload {
  email: string;
  password: string;
}

export async function sessionRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (isUnsafeMethod(method) && !headers.has('X-CSRFToken')) {
    headers.set('X-CSRFToken', await fetchCsrfToken());
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new Error(normalizeApiError(payload));
  }

  return payload?.data as T;
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  return sessionRequest<User>(API_ENDPOINTS.auth.register(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload): Promise<User> {
  return sessionRequest<User>(API_ENDPOINTS.auth.login(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return sessionRequest<User>(API_ENDPOINTS.auth.me());
}

export async function logoutUser(): Promise<void> {
  await sessionRequest<void>(API_ENDPOINTS.auth.logout(), { method: 'POST' });
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(API_ENDPOINTS.auth.csrf(), {
    credentials: 'include',
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<{ csrf_token?: string }>
    | null;

  if (!response.ok || !payload?.data?.csrf_token) {
    throw new Error('Unable to start a secure session. Please try again.');
  }

  return payload.data.csrf_token;
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}
