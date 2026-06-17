import type { FieldHook } from 'payload'

import { slugify } from '../../utils/slugify'

/** Chuẩn hoá slug (tiếng Việt không dấu, dùng `-`). */
export const formatSlug = (val: string): string => slugify(val)

/**
 * Hook server-side đảm bảo slug luôn đúng định dạng:
 * - Nếu người dùng nhập slug → chuẩn hoá chính nó.
 * - Nếu để trống (lúc tạo) → tự sinh từ field nguồn (vd `title`).
 */
export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string' && value.length > 0) {
      return formatSlug(value)
    }

    if (operation === 'create' || !data?.slug) {
      const fallbackData = data?.[fallback]
      if (typeof fallbackData === 'string' && fallbackData.length > 0) {
        return formatSlug(fallbackData)
      }
    }

    return value
  }
