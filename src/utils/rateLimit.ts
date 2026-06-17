/**
 * Rate-limit cơ bản, in-memory, theo key (vd IP).
 * Sliding window: tối đa `max` lần trong `windowMs`.
 *
 * Lưu ý: in-memory chỉ phù hợp 1 instance (dev/single-node). Lên production
 * nhiều instance nên thay bằng Redis/Upstash — xem ghi chú ở B3.
 */
const buckets = new Map<string, number[]>()

export const rateLimit = (
  key: string,
  max = 5,
  windowMs = 60_000,
): { allowed: boolean; retryAfterMs: number } => {
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs)

  if (hits.length >= max) {
    const retryAfterMs = windowMs - (now - hits[0])
    buckets.set(key, hits)
    return { allowed: false, retryAfterMs }
  }

  hits.push(now)
  buckets.set(key, hits)
  return { allowed: true, retryAfterMs: 0 }
}

/** Lấy IP client từ header (hỗ trợ proxy). */
export const getClientIp = (headers: Headers | undefined): string => {
  const fwd = headers?.get?.('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers?.get?.('x-real-ip') || 'local'
}
