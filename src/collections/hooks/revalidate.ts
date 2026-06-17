import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

/**
 * Bắn webhook revalidate sang frontend khi nội dung publish/unpublish/đổi.
 * Theo API-Contract mục 6:
 *   POST {FE_REVALIDATE_URL}
 *   { secret, collection, slug? }
 *
 * Fire-and-forget: lỗi (FE sập, sai secret) không làm hỏng thao tác lưu — chỉ log.
 */
const postRevalidate = async (
  payload: { logger: { warn: (msg: string) => void; info: (msg: string) => void } },
  collection: string,
  slug?: string,
) => {
  const url = process.env.FE_REVALIDATE_URL
  const secret = process.env.REVALIDATE_SECRET
  if (!url || !secret) {
    payload.logger.warn('[revalidate] Thiếu FE_REVALIDATE_URL/REVALIDATE_SECRET → bỏ qua webhook.')
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, collection, ...(slug ? { slug } : {}) }),
    })
    payload.logger.info(
      `[revalidate] → ${collection}${slug ? `/${slug}` : ''} (HTTP ${res.status})`,
    )
  } catch (err) {
    payload.logger.warn(`[revalidate] Gọi FE thất bại: ${(err as Error).message}`)
  }
}

/**
 * afterChange: revalidate khi doc đang/đã publish thay đổi.
 * - Collection có field `published`: chỉ bắn khi published hiện tại HOẶC trước đó = true
 *   (bao gồm publish, sửa khi đang publish, và unpublish).
 * - Collection không có `published` (stat-items, customer-logos): luôn bắn.
 */
export const revalidateAfterChange: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  collection,
  req,
}) => {
  const hasPublishedField = 'published' in doc
  const isOrWasPublished = Boolean(doc?.published) || Boolean(previousDoc?.published)
  if (!hasPublishedField || isOrWasPublished) {
    void postRevalidate(req.payload, collection.slug, doc?.slug)
  }
  return doc
}

/** afterDelete: xoá doc cũng cần revalidate FE. */
export const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, collection, req }) => {
  void postRevalidate(req.payload, collection.slug, doc?.slug)
  return doc
}
