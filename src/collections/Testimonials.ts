import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Cảm nhận', plural: 'Cảm nhận khách hàng' },
  admin: {
    useAsTitle: 'customerName',
    defaultColumns: ['customerName', 'customerRole', 'rating', 'published', 'order'],
    group: 'Nội dung',
  },
  access: {
    read: publishedOrStaff,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    { name: 'content', type: 'textarea', label: 'Nội dung cảm nhận', required: true },
    {
      type: 'row',
      fields: [
        { name: 'customerName', type: 'text', label: 'Tên khách hàng', required: true, admin: { width: '50%' } },
        { name: 'customerRole', type: 'text', label: 'Vai trò / Chức danh', admin: { width: '50%' } },
      ],
    },
    {
      name: 'rating',
      type: 'number',
      label: 'Số sao (1–5)',
      min: 1,
      max: 5,
      defaultValue: 5,
      admin: { description: 'Số sao 1–5.' },
    },
    { name: 'published', type: 'checkbox', label: 'Đã xuất bản', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
