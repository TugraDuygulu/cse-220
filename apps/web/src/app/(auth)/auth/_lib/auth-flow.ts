export type AuthVariant = 'reviewer' | 'business';
export type AuthRole = 'user' | 'reviewer' | 'owner' | 'admin';

export type RegisterFormInput = {
  email: string;
  password: string;
  displayName: string;
  variant: AuthVariant;
  username?: string;
};

export type RegisterPayload = {
  email: string;
  username: string;
  password: string;
  display_name: string;
  role: 'user' | 'owner';
};

export function destinationForRole(role: AuthRole | string | undefined): string {
  if (role === 'owner') {
    return '/owner/dashboard';
  }

  return '/restaurants';
}

export function roleForAuthVariant(variant: AuthVariant): 'user' | 'owner' {
  return variant === 'business' ? 'owner' : 'user';
}

export function getCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function normalizeApiError(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const candidate = payload as { error?: { message?: unknown } };
    if (typeof candidate.error?.message === 'string') {
      return candidate.error.message;
    }
  }

  return 'Something went wrong. Please try again.';
}

export function usernameFromEmail(email: string): string {
  const localPart = email.trim().toLowerCase().split('@')[0] ?? '';
  const normalized = localPart
    .replace(/\+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[-_.]{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');

  return normalized || 'flavormap-user';
}

export function buildRegisterPayload(input: RegisterFormInput): RegisterPayload {
  const username = input.username?.trim() || usernameFromEmail(input.email);

  return {
    email: input.email.trim().toLowerCase(),
    username,
    password: input.password,
    display_name: input.displayName.trim(),
    role: roleForAuthVariant(input.variant),
  };
}
