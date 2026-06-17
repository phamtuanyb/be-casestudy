/**
 * Seed dữ liệu mẫu + tạo user admin/editor/service (service có API key).
 * Chạy: `npm run seed`  (dùng `payload run` để nạp config + env tự động)
 *
 * Idempotent: chạy lại sẽ bỏ qua doc đã tồn tại (so theo slug/email).
 */
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import config from './payload.config'

/** Sinh chuỗi hex ngẫu nhiên (Web Crypto — tránh import 'crypto' lỗi dưới tsx). */
const randomHex = (bytes: number): string => {
  const arr = new Uint8Array(bytes)
  globalThis.crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('')
}

// --- helper: tạo richText lexical tối giản từ 1 đoạn text ---
const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr' as const,
        textFormat: 0,
        children: [
          { type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' },
        ],
      },
    ],
  },
})

/** Tìm doc theo field unique; nếu chưa có thì tạo. Trả về doc. */
async function getOrCreate(
  payload: Payload,
  collection: any,
  whereField: string,
  whereValue: string,
  data: Record<string, unknown>,
): Promise<any> {
  const existing = await payload.find({
    collection,
    where: { [whereField]: { equals: whereValue } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length > 0) {
    payload.logger.info(`• ${collection}: "${whereValue}" đã có → bỏ qua`)
    return existing.docs[0]
  }
  const doc = await payload.create({ collection, data: data as any, overrideAccess: true })
  payload.logger.info(`✓ ${collection}: tạo "${whereValue}"`)
  return doc
}

const seed = async () => {
  const payload = await getPayload({ config })

  // ============ USERS ============
  await getOrCreate(payload, 'users', 'email', 'admin@mkt.local', {
    email: 'admin@mkt.local',
    password: 'Admin@12345',
    name: 'Quản trị viên',
    roles: ['admin'],
  })

  await getOrCreate(payload, 'users', 'email', 'editor@mkt.local', {
    email: 'editor@mkt.local',
    password: 'Editor@12345',
    name: 'Biên tập viên',
    roles: ['editor'],
  })

  // Service user: bật API key cho frontend đọc server-to-server
  const serviceApiKey = process.env.SEED_SERVICE_API_KEY || randomHex(24)
  await getOrCreate(payload, 'users', 'email', 'service@mkt.local', {
    email: 'service@mkt.local',
    password: randomHex(16),
    name: 'Service (Frontend)',
    roles: ['service'],
    enableAPIKey: true,
    apiKey: serviceApiKey,
  })
  // Đọc lại để lấy API key đang lưu (kể cả khi user đã tồn tại từ lần seed trước)
  const serviceFound = await payload.find({
    collection: 'users',
    where: { email: { equals: 'service@mkt.local' } },
    limit: 1,
    showHiddenFields: true,
    overrideAccess: true,
  })
  const serviceToken = (serviceFound.docs[0] as any)?.apiKey || serviceApiKey

  // ============ PRODUCTS (6 sản phẩm MKT) ============
  const productsSeed = [
    { name: 'MKT Zalo', slug: 'mkt-zalo', tagline: 'Tự động hoá chăm sóc khách trên Zalo', icon: '💬', color: '#1E88E5', order: 1 },
    { name: 'MKT Care', slug: 'mkt-care', tagline: 'Nuôi & chăm sóc tài khoản đa kênh', icon: '🤝', color: '#43A047', order: 2 },
    { name: 'MKT Post', slug: 'mkt-post', tagline: 'Đăng bài hàng loạt lên Facebook', icon: '📣', color: '#3949AB', order: 3 },
    { name: 'MKT Telegram', slug: 'mkt-telegram', tagline: 'Marketing & chăm sóc qua Telegram', icon: '✈️', color: '#039BE5', order: 4 },
    { name: 'MKT TikTok', slug: 'mkt-tiktok', tagline: 'Tăng trưởng kênh TikTok tự động', icon: '🎵', color: '#000000', order: 5 },
    { name: 'MKT Data', slug: 'mkt-data', tagline: 'Khai thác & quản lý data khách hàng', icon: '📊', color: '#FB8C00', order: 6 },
  ]
  const productIds: Record<string, string> = {}
  for (const p of productsSeed) {
    const doc = await getOrCreate(payload, 'products', 'slug', p.slug, p)
    productIds[p.slug] = doc.id
  }

  // ============ INDUSTRIES ============
  const industriesSeed = [
    { name: 'Mỹ phẩm', slug: 'my-pham', order: 1 },
    { name: 'Bất động sản', slug: 'bat-dong-san', order: 2 },
    { name: 'Giáo dục', slug: 'giao-duc', order: 3 },
    { name: 'F&B', slug: 'f-and-b', order: 4 },
  ]
  const industryIds: Record<string, string> = {}
  for (const i of industriesSeed) {
    const doc = await getOrCreate(payload, 'industries', 'slug', i.slug, i)
    industryIds[i.slug] = doc.id
  }

  // ============ CASE STUDIES (2) ============
  await getOrCreate(payload, 'case-studies', 'slug', 'shop-my-pham-mkt-zalo', {
    title: 'Tự động chăm sóc 5.000 khách Zalo, x3 đơn lặp lại',
    slug: 'shop-my-pham-mkt-zalo',
    quote: 'Trước đây 3 nhân viên trực Zalo không xuể, giờ một mình tôi quản hết.',
    problem: richText('Shop có hơn 5.000 khách trên Zalo nhưng chăm sóc thủ công, bỏ sót tin nhắn, đơn lặp lại thấp.'),
    solution: richText('Triển khai MKT Zalo: tự động gắn thẻ, gửi kịch bản chăm sóc theo nhóm, nhắc mua lại đúng chu kỳ.'),
    result: richText('Sau 3 tháng: đơn lặp lại tăng gấp 3, thời gian phản hồi giảm 70%, chỉ cần 1 người vận hành.'),
    customerName: 'Chị Ngọc',
    customerRole: 'Chủ shop mỹ phẩm, Hà Nội',
    coverColor: 'linear-gradient(150deg,#0D47A1,#1565C0)',
    metrics: [
      { value: 'x3', label: 'đơn lặp lại' },
      { value: '-70%', label: 'thời gian phản hồi' },
    ],
    industry: industryIds['my-pham'],
    products: [productIds['mkt-zalo'], productIds['mkt-care']],
    featured: true,
    published: true,
    order: 1,
    seoTitle: 'Case study: Shop mỹ phẩm x3 đơn lặp lại nhờ MKT Zalo',
    seoDescription: 'Cách một shop mỹ phẩm tự động chăm sóc 5.000 khách Zalo và tăng x3 đơn lặp lại.',
  })

  await getOrCreate(payload, 'case-studies', 'slug', 'san-bds-mkt-post', {
    title: 'Phủ 200 nhóm BĐS mỗi ngày, giảm 60% chi phí ads',
    slug: 'san-bds-mkt-post',
    quote: 'Lượng lead tự nhiên về đều mỗi ngày mà không phải đốt tiền quảng cáo.',
    problem: richText('Sàn BĐS phụ thuộc hoàn toàn vào quảng cáo trả phí, chi phí lead ngày càng đắt.'),
    solution: richText('Dùng MKT Post đăng bài hàng loạt lên 200 nhóm Facebook mục tiêu theo lịch, kèm MKT Data lọc khách.'),
    result: richText('Lead tự nhiên tăng đều, chi phí quảng cáo giảm 60% trong khi tổng lead vẫn tăng.'),
    customerName: 'Anh Hùng',
    customerRole: 'Giám đốc sàn BĐS, TP.HCM',
    coverColor: 'linear-gradient(150deg,#1B5E20,#2E7D32)',
    metrics: [
      { value: '-60%', label: 'chi phí ads' },
      { value: '200', label: 'nhóm/ngày' },
    ],
    industry: industryIds['bat-dong-san'],
    products: [productIds['mkt-post'], productIds['mkt-data']],
    featured: false,
    published: true,
    order: 2,
    seoTitle: 'Case study: Sàn BĐS giảm 60% chi phí ads nhờ MKT Post',
    seoDescription: 'Phủ 200 nhóm BĐS mỗi ngày và giảm 60% chi phí quảng cáo với MKT Post + MKT Data.',
  })

  // ============ VIDEO REVIEWS (2) ============
  await getOrCreate(payload, 'video-reviews', 'slug', 'chi-ngoc-review-mkt-zalo', {
    title: 'Chị Ngọc review MKT Zalo sau 3 tháng',
    slug: 'chi-ngoc-review-mkt-zalo',
    description: 'Chủ shop mỹ phẩm chia sẻ trải nghiệm thực tế sau khi dùng MKT Zalo.',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'danh-gia',
    durationLabel: '4:12',
    thumbnailColor: '#0D47A1',
    industry: industryIds['my-pham'],
    products: [productIds['mkt-zalo']],
    featured: true,
    published: true,
    order: 1,
  })

  await getOrCreate(payload, 'video-reviews', 'slug', 'huong-dan-mkt-post-co-ban', {
    title: 'Hướng dẫn dùng MKT Post cơ bản',
    slug: 'huong-dan-mkt-post-co-ban',
    description: 'Các bước thiết lập đăng bài hàng loạt với MKT Post.',
    youtubeId: 'dQw4w9WgXcQ',
    category: 'huong-dan',
    durationLabel: '8:30',
    thumbnailColor: '#1B5E20',
    industry: industryIds['bat-dong-san'],
    products: [productIds['mkt-post']],
    featured: false,
    published: true,
    order: 2,
  })

  payload.logger.info('──────────────────────────────────────────────')
  payload.logger.info('SEED HOÀN TẤT.')
  payload.logger.info('Admin:  admin@mkt.local  / Admin@12345')
  payload.logger.info('Editor: editor@mkt.local / Editor@12345')
  payload.logger.info(`Service API key (cho FE): ${serviceToken}`)
  payload.logger.info('Header gọi API: Authorization: users API-Key <key>')
  payload.logger.info('──────────────────────────────────────────────')

  process.exit(0)
}

// Dùng top-level await để `payload run` chờ seed chạy xong mới thoát process.
try {
  await seed()
} catch (err) {
  console.error('[seed] Lỗi:', err)
  process.exit(1)
}
