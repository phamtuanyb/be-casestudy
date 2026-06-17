import type { CollectionAfterChangeHook } from 'payload'

/**
 * Gửi email thông báo khi có lead mới (afterChange, operation create).
 * Dùng `payload.sendEmail` — transport cấu hình ở payload.config:
 *   - Có RESEND_API_KEY  → gửi thật qua Resend.
 *   - Không có           → Payload log nội dung email ra console (tiện dev).
 */
export const notifyLead: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  const to = process.env.LEAD_NOTIFY_EMAIL
  if (!to) {
    req.payload.logger.warn('[lead] Thiếu LEAD_NOTIFY_EMAIL → bỏ qua gửi email.')
    return doc
  }

  const rows: [string, unknown][] = [
    ['Tên', doc.name],
    ['SĐT', doc.phone],
    ['Email', doc.email],
    ['Lời nhắn', doc.message],
    ['Sản phẩm quan tâm', doc.productInterest],
    ['Nguồn (slug)', doc.sourceSlug],
    ['UTM', doc.utm ? JSON.stringify(doc.utm) : undefined],
  ]
  const html = `<h2>🔔 Lead mới từ MKT Showcase</h2><table cellpadding="6" style="border-collapse:collapse">${rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><td style="font-weight:bold">${k}</td><td>${String(v)}</td></tr>`)
    .join('')}</table>`

  try {
    await req.payload.sendEmail({
      to,
      subject: `[Lead] ${doc.name} — ${doc.phone}`,
      html,
    })
    req.payload.logger.info(`[lead] Đã gửi email thông báo tới ${to} (lead: ${doc.name})`)
  } catch (err) {
    req.payload.logger.error(`[lead] Gửi email thất bại: ${(err as Error).message}`)
  }

  return doc
}
