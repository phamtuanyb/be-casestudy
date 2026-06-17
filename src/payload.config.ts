import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { vi } from '@payloadcms/translations/languages/vi'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { Industries } from './collections/Industries'
import { CaseStudies } from './collections/CaseStudies'
import { VideoReviews } from './collections/VideoReviews'
import { Testimonials } from './collections/Testimonials'
import { StatItems } from './collections/StatItems'
import { CustomerLogos } from './collections/CustomerLogos'
import { Leads } from './collections/Leads'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

/** Đọc danh sách origin từ env (phân tách dấu phẩy), tự thêm serverURL. */
const parseOrigins = (envValue?: string): string[] => {
  const fromEnv = (envValue || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  return Array.from(new Set([serverURL, ...fromEnv]))
}

const corsOrigins = parseOrigins(process.env.CORS_ORIGINS)
const csrfOrigins = parseOrigins(process.env.CSRF_ORIGINS)

const databaseURI = process.env.DATABASE_URI || 'file:./mkt.db'
const isPostgres = databaseURI.startsWith('postgres')

// DB động: Postgres khi DATABASE_URI là postgres:// (production), còn lại SQLite (dev).
const db = isPostgres
  ? postgresAdapter({ pool: { connectionString: databaseURI } })
  : sqliteAdapter({ client: { url: databaseURI } })

// Email: có RESEND_API_KEY → gửi thật qua Resend; không có → Payload log ra console (dev).
const email = process.env.RESEND_API_KEY
  ? resendAdapter({
      defaultFromAddress: process.env.RESEND_FROM_ADDRESS || 'onboarding@resend.dev',
      defaultFromName: process.env.RESEND_FROM_NAME || 'MKT Showcase',
      apiKey: process.env.RESEND_API_KEY,
    })
  : undefined

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '— MKT Showcase',
    },
    components: {
      graphics: {
        Logo: '/components/admin/Logo#Logo',
        Icon: '/components/admin/Icon#Icon',
      },
      beforeLogin: ['/components/admin/BeforeLogin#BeforeLogin'],
      beforeDashboard: ['/components/admin/BeforeDashboard#BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  serverURL,
  // Admin mặc định tiếng Việt (vẫn có thể chuyển sang English trong Account).
  i18n: {
    fallbackLanguage: 'vi',
    supportedLanguages: { vi, en },
  },
  // Chỉ origin trong env (nhiều vertical) được gọi API kèm cookie/credential.
  cors: corsOrigins,
  csrf: csrfOrigins,
  collections: [
    // Danh mục
    Products,
    Industries,
    // Nội dung
    CaseStudies,
    VideoReviews,
    Testimonials,
    StatItems,
    CustomerLogos,
    // Marketing
    Leads,
    // Hệ thống
    Media,
    Users,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  email,
  sharp,
  plugins: [],
})
