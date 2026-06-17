import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Sản phẩm', plural: 'Sản phẩm' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
    group: 'Danh mục',
  },
  access: {
    read: anyone, // danh mục dùng cho filter — public đọc hết
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', label: 'Tên sản phẩm', required: true },
    ...slugField('name'),
    { name: 'tagline', type: 'text', label: 'Khẩu hiệu (tagline)' },
    { name: 'icon', type: 'text', label: 'Icon', admin: { description: 'Tên icon hoặc emoji.' } },
    { name: 'color', type: 'text', label: 'Màu thương hiệu', admin: { description: 'Màu thương hiệu, vd #1E88E5.' } },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
