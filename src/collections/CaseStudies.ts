import type { CollectionConfig } from 'payload'

import { isAdminOrEditor, publishedOrStaff } from '../access'
import { slugField } from '../fields/slug'
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate'

export const CaseStudies: CollectionConfig = {
  slug: 'case-studies',
  labels: { singular: 'Câu chuyện', plural: 'Câu chuyện khách hàng' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'industry', 'featured', 'published', 'order'],
    group: 'Nội dung',
  },
  access: {
    read: publishedOrStaff, // public chỉ thấy published; staff thấy hết
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  defaultSort: 'order',
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Tự đặt publishedAt lần đầu publish
        if (data?.published && !data.publishedAt) {
          data.publishedAt = new Date().toISOString()
        }
        return data
      },
    ],
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    { name: 'title', type: 'text', label: 'Tiêu đề', required: true },
    ...slugField('title'),
    {
      name: 'quote',
      type: 'textarea',
      label: 'Câu trích dẫn',
      admin: { description: 'Câu trích dẫn ngắn của khách hàng.' },
    },
    // 3 khối nội dung trang chi tiết: Vấn đề / Giải pháp / Kết quả
    { name: 'problem', type: 'richText', label: 'Vấn đề' },
    { name: 'solution', type: 'richText', label: 'Giải pháp' },
    { name: 'result', type: 'richText', label: 'Kết quả' },
    {
      type: 'row',
      fields: [
        { name: 'customerName', type: 'text', label: 'Tên khách hàng', admin: { width: '50%' } },
        { name: 'customerRole', type: 'text', label: 'Vai trò / Chức danh', admin: { width: '50%' } },
      ],
    },
    {
      type: 'collapsible',
      label: 'Thông tin liên hệ khách hàng (mục 4 — chỉ hiện trên web nếu có dữ liệu)',
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'customerPhone', type: 'text', label: 'Số điện thoại', admin: { width: '50%' } },
            { name: 'customerEmail', type: 'email', label: 'Email', admin: { width: '50%' } },
          ],
        },
        {
          name: 'customerChannels',
          type: 'array',
          label: 'Kênh truyền thông',
          labels: { singular: 'Kênh', plural: 'Kênh' },
          admin: { description: 'Facebook/Zalo/TikTok/YouTube/Website... của khách hàng.' },
          fields: [
            {
              name: 'platform',
              type: 'select',
              label: 'Nền tảng',
              defaultValue: 'facebook',
              options: [
                { label: 'Facebook', value: 'facebook' },
                { label: 'Zalo', value: 'zalo' },
                { label: 'TikTok', value: 'tiktok' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'Instagram', value: 'instagram' },
                { label: 'Website', value: 'website' },
                { label: 'Khác', value: 'khac' },
              ],
              admin: { width: '34%' },
            },
            { name: 'label', type: 'text', label: 'Tên hiển thị', admin: { width: '33%' } },
            { name: 'url', type: 'text', label: 'Đường dẫn (URL)', admin: { width: '33%' } },
          ],
        },
      ],
    },
    { name: 'customerAvatar', type: 'upload', label: 'Ảnh đại diện khách hàng', relationTo: 'media' },
    { name: 'coverImage', type: 'upload', label: 'Ảnh bìa', relationTo: 'media' },
    {
      name: 'coverColor',
      type: 'text',
      label: 'Màu / Gradient bìa',
      admin: {
        description: 'Màu hoặc gradient CSS, vd: linear-gradient(150deg,#0D47A1,#1565C0)',
      },
    },
    {
      name: 'youtubeId',
      type: 'text',
      label: 'Video YouTube (ID)',
      admin: {
        description: 'ID video YouTube nhúng vào trang chi tiết (vd: vWszM_AghPA). Để trống nếu không có.',
      },
    },
    {
      name: 'metrics',
      type: 'array',
      label: 'Chỉ số kết quả',
      labels: { singular: 'Chỉ số', plural: 'Chỉ số' },
      admin: { description: 'Phần tử đầu (metrics[0]) là số nổi bật (bigValue).' },
      fields: [
        { name: 'value', type: 'text', label: 'Giá trị', required: true, admin: { width: '50%' } },
        { name: 'label', type: 'text', label: 'Nhãn', required: true, admin: { width: '50%' } },
      ],
    },
    {
      name: 'industry',
      type: 'relationship',
      label: 'Ngành',
      relationTo: 'industries',
    },
    {
      name: 'products',
      type: 'relationship',
      label: 'Sản phẩm',
      relationTo: 'products',
      hasMany: true,
      admin: { description: 'Phần tử đầu (products[0]) là sản phẩm chính.' },
    },
    // --- sidebar ---
    { name: 'featured', type: 'checkbox', label: 'Nổi bật', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'published', type: 'checkbox', label: 'Đã xuất bản', defaultValue: false, admin: { position: 'sidebar' } },
    {
      name: 'publishedAt',
      type: 'date',
      label: 'Ngày xuất bản',
      admin: { position: 'sidebar', description: 'Tự đặt khi publish lần đầu.' },
    },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
    // --- SEO ---
    { name: 'seoTitle', type: 'text', label: 'SEO — Tiêu đề' },
    { name: 'seoDescription', type: 'textarea', label: 'SEO — Mô tả' },
  ],
}
