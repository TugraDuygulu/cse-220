/**
 * Shared environment configuration for the FlavorMap web app.
 *
 * All API URLs and environment-dependent values are read from
 * NEXT_PUBLIC_API_BASE_URL, which must match the DJANGO_PORT
 * configured in apps/api/.env.development.
 */

export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
    'http://localhost:8020',
} as const;

export function apiPath(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${env.apiBaseUrl}${clean}`;
}
