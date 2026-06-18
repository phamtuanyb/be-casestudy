/**
 * Import hàng loạt case study từ import-data/<order>.json (do workflow trích xuất).
 * Tạo PUBLISHED, đúng order (mới nhất = order 1 = đầu trang), publishedAt = ngày gốc.
 * Chạy: `npm run import:data`
 *
 * Idempotent: case đã có (theo slug) sẽ được cập nhật order/publishedAt, không tạo trùng.
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import config from '@payload-config'
import { slugify } from './utils/slugify'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const DATA_DIR = join(process.cwd(), 'import-data')

type Channel = { platform?: string; label?: string; url?: string }
type Item = {
  order: number
  date: string
  slug: string
  url: string
  title: string
  customerName?: string
  customerRole?: string
  quote?: string
  problem?: string[]
  solution?: string[]
  result?: string[]
  metrics?: { value: string; label: string }[]
  products?: string[]
  industry?: string
  customerPhone?: string
  customerEmail?: string
  customerChannels?: Channel[]
  coverImageUrl?: string
  youtubeId?: string
}

const COVER_COLORS = [
  'linear-gradient(150deg,#0D47A1,#1565C0)',
  'linear-gradient(150deg,#1B5E20,#2E7D32)',
  'linear-gradient(150deg,#4A148C,#6A1B9A)',
  'linear-gradient(150deg,#B71C1C,#E53935)',
  'linear-gradient(150deg,#E65100,#FB8C00)',
  'linear-gradient(150deg,#004D40,#00897B)',
]

/** Giải mã entity HTML phổ biến trong tiêu đề. */
const decode = (s: string): string =>
  (s || '')
    .replace(/&amp;|&#0?38;/g, '&')
    .replace(/&#0?39;|&#8217;|&#8216;/g, '’')
    .replace(/&#8211;|&#8212;/g, '–')
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

/** Mảng đoạn văn -> richText Lexical. */
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs
      .filter((t) => t && t.trim())
      .map((text) => ({
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [{ type: 'text', version: 1, text: text.trim(), detail: 0, format: 0, mode: 'normal', style: '' }],
      })),
  },
})

async function getOrCreate(
  payload: Payload,
  collection: 'products' | 'industries',
  name: string,
  cache: Map<string, number | string>,
): Promise<number | string | null> {
  const clean = decode(name).trim()
  if (!clean) return null
  const slug = slugify(clean)
  if (!slug) return null
  if (cache.has(slug)) return cache.get(slug)!
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  let id: number | string
  if (found.docs.length) id = found.docs[0].id
  else {
    const doc = await payload.create({ collection, data: { name: clean, slug, order: 99 } as any, overrideAccess: true })
    id = doc.id
    payload.logger.info(`  + ${collection}: "${clean}"`)
  }
  cache.set(slug, id)
  return id
}

async function uploadCover(payload: Payload, url: string, alt: string): Promise<number | string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null
  const name = (url.split('/').pop() || 'cover.jpg').split('?')[0]
  try {
    const existed = await payload.find({ collection: 'media', where: { filename: { equals: name } }, limit: 1, overrideAccess: true })
    if (existed.docs.length) return existed.docs[0].id
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const tmp = join(tmpdir(), name)
    writeFileSync(tmp, buf)
    const media = await payload.create({ collection: 'media', data: { alt: decode(alt).slice(0, 120) } as any, filePath: tmp, overrideAccess: true })
    try { unlinkSync(tmp) } catch { /* ignore */ }
    return media.id
  } catch (e) {
    payload.logger.warn(`  ⚠ ảnh bìa lỗi (${name}): ${(e as Error).message}`)
    return null
  }
}

const run = async () => {
  const payload = await getPayload({ config })

  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))
  const items: Item[] = files
    .map((f) => {
      try { return JSON.parse(readFileSync(join(DATA_DIR, f), 'utf8')) as Item } catch { return null }
    })
    .filter((x): x is Item => Boolean(x && x.slug && x.order))
    .sort((a, b) => a.order - b.order)

  payload.logger.info(`Đọc ${items.length} bài từ import-data/`)

  const prodCache = new Map<string, number | string>()
  const indCache = new Map<string, number | string>()
  let created = 0
  let updated = 0

  for (const it of items) {
    const title = decode(it.title)
    const slug = it.slug
    const coverColor = COVER_COLORS[it.order % COVER_COLORS.length]

    const industryId = it.industry ? await getOrCreate(payload, 'industries', it.industry, indCache) : null
    const productIds: (number | string)[] = []
    for (const pn of it.products || []) {
      const id = await getOrCreate(payload, 'products', pn, prodCache)
      if (id) productIds.push(id)
    }

    const existing = await payload.find({ collection: 'case-studies', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })

    const channels = (it.customerChannels || [])
      .filter((c) => c && (c.url || c.label))
      .map((c) => ({ platform: (c.platform || 'khac').toLowerCase(), label: c.label ? decode(c.label) : undefined, url: c.url || undefined }))

    const data: Record<string, unknown> = {
      title,
      slug,
      quote: it.quote ? decode(it.quote) : undefined,
      ...(it.problem?.length ? { problem: richText(it.problem) } : {}),
      ...(it.solution?.length ? { solution: richText(it.solution) } : {}),
      ...(it.result?.length ? { result: richText(it.result) } : {}),
      customerName: it.customerName ? decode(it.customerName) : undefined,
      customerRole: it.customerRole ? decode(it.customerRole) : undefined,
      ...(it.customerPhone ? { customerPhone: it.customerPhone } : {}),
      ...(it.customerEmail ? { customerEmail: it.customerEmail } : {}),
      ...(channels.length ? { customerChannels: channels } : {}),
      coverColor,
      ...(it.youtubeId ? { youtubeId: it.youtubeId } : {}),
      ...(Array.isArray(it.metrics) && it.metrics.length ? { metrics: it.metrics } : {}),
      ...(industryId ? { industry: industryId } : {}),
      ...(productIds.length ? { products: productIds } : {}),
      featured: it.order <= 3, // 3 bài mới nhất nổi bật
      published: true,
      order: it.order,
      publishedAt: it.date,
      seoTitle: title,
      seoDescription: it.quote ? decode(it.quote).slice(0, 160) : title,
    }

    const coverId = await uploadCover(payload, it.coverImageUrl || '', title)
    if (coverId) data.coverImage = coverId

    if (existing.docs.length) {
      await payload.update({ collection: 'case-studies', id: existing.docs[0].id, data: data as any, overrideAccess: true })
      updated++
    } else {
      await payload.create({ collection: 'case-studies', data: data as any, overrideAccess: true })
      created++
    }
    if ((created + updated) % 20 === 0) payload.logger.info(`  ...đã xử lý ${created + updated}/${items.length}`)
  }

  payload.logger.info('──────────────────────────────────────────')
  payload.logger.info(`IMPORT XONG: tạo mới ${created}, cập nhật ${updated} (PUBLISHED, đúng order).`)
  process.exit(0)
}

try {
  await run()
} catch (err) {
  console.error('[import:data] Lỗi:', err)
  process.exit(1)
}
