/**
 * Import bài case study từ phanmemmkt.vn (cũ) → CMS (mới), trạng thái NHÁP.
 * Nội dung do AI trích & tách sẵn (Vấn đề/Giải pháp/Kết quả + metrics + quote).
 * Chạy: `npm run import`  (runner giống seed)
 *
 * Idempotent: chạy lại bỏ qua case đã có (so theo slug).
 */
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import config from '@payload-config'
import { slugify } from './utils/slugify'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'

// --- richText: nhiều đoạn văn -> Lexical ---
const richText = (paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      version: 1,
      format: '',
      indent: 0,
      direction: 'ltr' as const,
      textFormat: 0,
      children: [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }],
    })),
  },
})

type ID = number | string

async function getOrCreate(
  payload: Payload,
  collection: 'products' | 'industries',
  slug: string,
  data: Record<string, unknown>,
): Promise<ID> {
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
  if (found.docs.length) return found.docs[0].id
  const doc = await payload.create({ collection, data: { ...data, slug } as any, overrideAccess: true })
  payload.logger.info(`✓ ${collection}: tạo "${slug}"`)
  return doc.id
}

/** Tải ảnh từ URL → upload vào Media → trả về id (null nếu lỗi). Idempotent theo tên file. */
async function uploadCover(payload: Payload, url: string, alt: string): Promise<ID | null> {
  const name = url.split('/').pop()?.split('?')[0] || 'cover.jpg'
  try {
    const existed = await payload.find({ collection: 'media', where: { filename: { equals: name } }, limit: 1, overrideAccess: true })
    if (existed.docs.length) {
      payload.logger.info(`  ↪ dùng lại ảnh đã có: ${name}`)
      return existed.docs[0].id
    }
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const tmp = join(tmpdir(), name)
    writeFileSync(tmp, buf)
    const media = await payload.create({ collection: 'media', data: { alt } as any, filePath: tmp, overrideAccess: true })
    try { unlinkSync(tmp) } catch { /* ignore */ }
    payload.logger.info(`  ↑ upload ảnh bìa: ${name}`)
    return media.id
  } catch (e) {
    payload.logger.warn(`  ⚠ không tải được ảnh bìa (${url}): ${(e as Error).message}`)
    return null
  }
}

// ====== Dữ liệu 2 bài (AI trích từ bài gốc) ======
type Article = {
  sourceUrl: string
  title: string
  customerName: string
  customerRole: string
  quote: string
  problem: string[]
  solution: string[]
  result: string[]
  metrics: { value: string; label: string }[]
  coverColor: string
  coverImageUrl: string
  youtubeId?: string
  contact?: {
    phone?: string
    email?: string
    channels?: { platform: string; label?: string; url?: string }[]
  }
  product: { slug: string; name: string; tagline?: string; color?: string }
  industry: { slug: string; name: string }
  seoTitle: string
  seoDescription: string
}

const ARTICLES: Article[] = [
  {
    sourceUrl: 'https://phanmemmkt.vn/casesudy-anh-dang-tang-don-tiktok-nho-mkt-tikpro',
    title: 'Cách anh Đăng tăng đơn TikTok bền vững không phụ thuộc Ads với MKT TikPro',
    customerName: 'Anh Đăng',
    customerRole: 'Chủ shop bán hàng online trên TikTok',
    quote:
      'Có những tính năng chỉ cần vài nút bấm là xong. Tôi cài đặt rồi đi làm việc khác, tối về phần mềm vẫn chạy mượt.',
    problem: [
      'Anh Đăng bắt đầu bán hàng online từ năm 2017. Khi muốn mở rộng quy mô trên TikTok, anh đứng trước hai lựa chọn khó: tuyển thêm nhân sự (chi phí quản lý cao) hoặc chạy quảng cáo (bào mòn biên lợi nhuận).',
      'Anh cần một cách tăng trưởng bền vững mà không phải phụ thuộc vào tiền quảng cáo.',
    ],
    solution: [
      'Anh sử dụng MKT TikPro để tự động hoá vận hành kênh TikTok, đặc biệt là tính năng seeding livestream.',
      'Phần mềm tự động tăng lượt xem, thả tim và bình luận theo kịch bản, tạo cảm giác đông người và kéo dài thời gian khách ở lại phiên live. Anh chỉ cần vài nút bấm để thiết lập rồi làm việc khác.',
    ],
    result: [
      'Sau hơn 5 năm sử dụng, anh duy trì tăng trưởng ổn định mà không phụ thuộc vào quảng cáo.',
      'Thay vì chi lớn cho Ads, anh chỉ đầu tư khoảng 3 triệu đồng/năm cho công cụ và tập trung vào sản phẩm, tư vấn và xử lý đơn.',
    ],
    metrics: [
      { value: '5 năm', label: 'tăng trưởng không phụ thuộc Ads' },
      { value: '~3tr/năm', label: 'chi phí phần mềm' },
    ],
    coverColor: 'linear-gradient(150deg,#111827,#374151)',
    coverImageUrl: 'https://phanmemmkt.vn/wp-content/uploads/2026/06/anh-dang-dung-mkt-tikpro-ban-hang-online.jpg',
    youtubeId: 'vWszM_AghPA',
    product: { slug: 'mkt-tikpro', name: 'MKT TikPro', tagline: 'Nuôi & tự động hoá kênh TikTok', color: '#111827' },
    industry: { slug: 'thuong-mai-dien-tu', name: 'Thương mại điện tử' },
    seoTitle: 'Anh Đăng tăng đơn TikTok bền vững không cần Ads với MKT TikPro',
    seoDescription:
      'Hành trình 5 năm bán hàng TikTok không phụ thuộc quảng cáo của anh Đăng nhờ tự động hoá livestream bằng MKT TikPro.',
  },
  {
    sourceUrl: 'https://phanmemmkt.vn/anh-khanh-sale-bds-tho-cu-dang-tin-voi-mkt-care',
    title: 'Anh Khánh sale BĐS thổ cư và bí quyết đăng tin tự động bằng MKT Care',
    customerName: 'Anh Dương Ngọc Khánh',
    customerRole: 'Sale bất động sản thổ cư',
    quote: 'Chỉ mất khoảng 10k/ngày mà mình có thể nhàn hơn rất nhiều.',
    problem: [
      'Anh Dương Ngọc Khánh là sale bất động sản thổ cư. Đặc thù nghề đòi hỏi đăng tin liên tục lên rất nhiều hội nhóm Facebook để tiếp cận khách mua bán nhà đất.',
      'Đăng tin thủ công vừa tốn thời gian, vừa khó phủ đủ số lượng nhóm cần thiết.',
    ],
    solution: [
      'Anh dùng MKT Care để nuôi nick Facebook và đăng tin tự động hàng loạt lên các hội nhóm BĐS.',
      'Phần mềm hỗ trợ chia sẻ bài, nhắn tin, seeding tương tác và lưu lịch sử đăng tin, giúp anh chuẩn bị nội dung một lần rồi để hệ thống tự chạy.',
    ],
    result: [
      'Mỗi ngày anh đăng được 1.000–2.000 tin BĐS lên các hội nhóm, tiếp cận lượng khách tiềm năng lớn hơn hẳn và tăng tỷ lệ chốt.',
      'Chi phí chỉ khoảng 10.000đ/ngày, và chỉ mất khoảng một tuần để sử dụng thành thạo.',
    ],
    metrics: [
      { value: '1.000–2.000', label: 'tin BĐS đăng mỗi ngày' },
      { value: '~10k/ngày', label: 'chi phí vận hành' },
    ],
    coverColor: 'linear-gradient(150deg,#1B5E20,#2E7D32)',
    coverImageUrl: 'https://phanmemmkt.vn/wp-content/uploads/2026/06/anh-khanh-sale-bds-tho-cu.jpg',
    contact: {
      phone: '0337 928 378',
      channels: [{ platform: 'facebook', label: 'Dương Ngọc Khánh' }],
    },
    product: { slug: 'mkt-care', name: 'MKT Care', tagline: 'Nuôi & chăm sóc tài khoản đa kênh', color: '#43A047' },
    industry: { slug: 'bat-dong-san', name: 'Bất động sản' },
    seoTitle: 'Anh Khánh đăng 1000+ tin BĐS mỗi ngày tự động với MKT Care',
    seoDescription:
      'Cách sale BĐS thổ cư Dương Ngọc Khánh đăng 1.000–2.000 tin mỗi ngày lên hội nhóm Facebook và tăng tỷ lệ chốt với MKT Care.',
  },
]

const run = async () => {
  const payload = await getPayload({ config })

  for (const a of ARTICLES) {
    const slug = slugify(a.title)
    const exists = await payload.find({ collection: 'case-studies', where: { slug: { equals: slug } }, limit: 1, overrideAccess: true })
    if (exists.docs.length) {
      payload.logger.info(`• case-studies: "${slug}" đã có → bỏ qua`)
      continue
    }

    const industryId = await getOrCreate(payload, 'industries', a.industry.slug, { name: a.industry.name, order: 99 })
    const productId = await getOrCreate(payload, 'products', a.product.slug, {
      name: a.product.name,
      tagline: a.product.tagline,
      color: a.product.color,
      order: 99,
    })
    const coverId = await uploadCover(payload, a.coverImageUrl, a.title)

    await payload.create({
      collection: 'case-studies',
      overrideAccess: true,
      data: {
        title: a.title,
        slug,
        quote: a.quote,
        problem: richText(a.problem) as any,
        solution: richText(a.solution) as any,
        result: richText(a.result) as any,
        customerName: a.customerName,
        customerRole: a.customerRole,
        ...(a.contact?.phone ? { customerPhone: a.contact.phone } : {}),
        ...(a.contact?.email ? { customerEmail: a.contact.email } : {}),
        ...(a.contact?.channels?.length ? { customerChannels: a.contact.channels } : {}),
        coverColor: a.coverColor,
        ...(a.youtubeId ? { youtubeId: a.youtubeId } : {}),
        ...(coverId ? { coverImage: coverId } : {}),
        metrics: a.metrics,
        industry: industryId,
        products: [productId],
        featured: false,
        published: false, // NHÁP — chờ review
        seoTitle: a.seoTitle,
        seoDescription: a.seoDescription,
      } as any,
    })
    payload.logger.info(`✓ case-studies: tạo NHÁP "${slug}"  (nguồn: ${a.sourceUrl})`)
  }

  payload.logger.info('──────────────────────────────────────────')
  payload.logger.info(`IMPORT XONG ${ARTICLES.length} bài (trạng thái: NHÁP). Vào /admin để review & publish.`)
  process.exit(0)
}

try {
  await run()
} catch (err) {
  console.error('[import] Lỗi:', err)
  process.exit(1)
}
