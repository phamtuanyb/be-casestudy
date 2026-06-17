import type { CollectionBeforeValidateHook } from 'payload'
import { APIError } from 'payload'

import { getClientIp, rateLimit } from '../../utils/rateLimit'

const MAX_LEADS_PER_WINDOW = 5
const WINDOW_MS = 60_000 // 1 phút

/**
 * Chống spam cho Leads — chỉ áp dụng khi public (ẩn danh) tạo lead:
 *  1. Honeypot: field `_hp` phải rỗng. Bot điền vào → bỏ qua (coi như spam).
 *  2. Rate-limit: tối đa 5 lead/phút/IP.
 * Admin/editor tạo lead trong panel (req.user) thì không bị chặn.
 */
export const leadSpamGuard: CollectionBeforeValidateHook = ({ data, req, operation }) => {
  if (operation !== 'create' || req.user) return data

  const payload = data as Record<string, unknown> | undefined

  // 1) Honeypot
  const hp = payload?._hp
  if (typeof hp === 'string' && hp.trim() !== '') {
    throw new APIError('Yêu cầu không hợp lệ.', 400)
  }
  if (payload) delete payload._hp // không lưu field honeypot vào DB

  // 2) Rate-limit theo IP
  const ip = getClientIp(req.headers)
  const { allowed, retryAfterMs } = rateLimit(`lead:${ip}`, MAX_LEADS_PER_WINDOW, WINDOW_MS)
  if (!allowed) {
    throw new APIError(
      `Bạn gửi quá nhanh, thử lại sau ${Math.ceil(retryAfterMs / 1000)}s.`,
      429,
    )
  }

  return data
}
