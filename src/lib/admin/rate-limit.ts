import "server-only";

/**
 * Kinetra CRM — fixed-window in-memory rate limiter (Phase 1).
 *
 * Used ONLY for /admin login attempts. Deliberately self-contained so it
 * cannot interfere with any rate limiting you already run for the public
 * contact API — the two systems never share state or code paths.
 *
 * Suitable for the current single-instance standalone deployment. If you
 * ever scale to multiple instances, swap the internals for a shared store
 * (e.g. Upstash Redis) — the call sites won't need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

export interface RateLimitOptions {
  /** Maximum attempts per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function prune(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

/** Reset a key after a successful login so honest users aren't penalized. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}