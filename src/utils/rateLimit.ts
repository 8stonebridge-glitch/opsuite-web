/**
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 * Uses IP + optional route key as the identifier.
 *
 * NOTE: Resets on server restart. For multi-instance deployments use Redis.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

/** Clean up stale windows every 5 minutes to avoid memory leaks */
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Unique key suffix to namespace by route (e.g. 'login', 'api') */
  key?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if the given identifier is within rate limit.
 *
 * @param identifier - Usually the client IP address
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const { limit, windowMs, key = 'default' } = options;
  const storeKey = `${key}:${identifier}`;
  const now = Date.now();

  let win = store.get(storeKey);

  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    store.set(storeKey, win);
  }

  win.count += 1;

  return {
    allowed: win.count <= limit,
    remaining: Math.max(0, limit - win.count),
    resetAt: win.resetAt,
  };
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
