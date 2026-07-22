import "server-only";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * SCOPE / LIMITATION:
 *   State lives in a single Node process. Kinetra deploys as a long-lived
 *   Next.js standalone server behind Caddy (one process), so this is effective
 *   and dependency-free. If you ever scale to multiple instances or a
 *   serverless platform (where each invocation may be a fresh process), move
 *   this to a shared store — e.g. Upstash Redis or Vercel KV — using the same
 *   interface below. Do NOT rely on in-memory limiting across many replicas.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map can't grow without bound under attack.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

/**
 * @param key   Stable identifier for the caller (e.g. `contact:<ip>`).
 * @param opts  `limit` requests allowed per rolling `windowMs`.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: opts.limit,
      remaining: opts.limit - 1,
      resetAt,
      retryAfterSec: 0,
    };
  }

  existing.count += 1;
  const allowed = existing.count <= opts.limit;

  return {
    allowed,
    limit: opts.limit,
    remaining: Math.max(0, opts.limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSec: allowed ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}
