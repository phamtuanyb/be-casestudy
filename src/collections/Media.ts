import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Tệp media', plural: 'Thư viện ảnh' },
  admin: {
    group: 'Hệ thống',
  },
  access: {
    read: anyone, // ảnh public để frontend hiển thị
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Mô tả ảnh (alt)',
      required: true,
    },
  ],
  upload: true,
}
