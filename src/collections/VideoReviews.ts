import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate'

export const VideoReviews: CollectionConfig = {
  slug: 'video-reviews',
  labels: { singular: 'Video', plural: 'Video đánh giá' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'featured', 'published', 'order'],
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
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true },
    ...slugField('title'),
    { name: 'description', type: 'textarea', label: 'Mô tả' },
    {
      name: 'youtubeId',
      type: 'text',
      label: 'YouTube ID',
      required: true,
      admin: { description: 'ID video YouTube, vd: abc123XYZ.' },
    },
    {
      name: 'category',
      type: 'select',
      label: 'Danh mục',
      defaultValue: 'danh-gia',
      options: [
        { label: 'Đánh giá', value: 'danh-gia' },
        { label: 'Hướng dẫn', value: 'huong-dan' },
        { label: 'Phỏng vấn', value: 'phong-van' },
        { label: 'Case study', value: 'case-study' },
      ],
    },
    { name: 'durationLabel', type: 'text', label: 'Thời lượng', admin: { description: 'vd: 4:12' } },
    { name: 'thumbnailColor', type: 'text', label: 'Màu thumbnail', admin: { description: 'vd: #0D47A1' } },
    { name: 'industry', type: 'relationship', label: 'Ngành', relationTo: 'industries' },
    { name: 'products', type: 'relationship', label: 'Sản phẩm', relationTo: 'products', hasMany: true },
    // --- sidebar ---
    { name: 'featured', type: 'checkbox', label: 'Nổi bật', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'published', type: 'checkbox', label: 'Đã xuất bản', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
