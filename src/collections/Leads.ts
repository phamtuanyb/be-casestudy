import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '../access'
import { leadSpamGuard } from './hooks/leadSpamGuard'
import { notifyLead } from './hooks/notifyLead'

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Khách tiềm năng', plural: 'Khách tiềm năng (Leads)' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'phone', 'productInterest', 'status', 'createdAt'],
    group: 'Marketing',
  },
  access: {
    create: anyone, // frontend gửi lead ẩn danh — chống spam bằng honeypot + rate-limit
    read: isAdmin, // chỉ admin xem
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [leadSpamGuard],
    afterChange: [notifyLead],
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Họ tên', required: true, admin: { width: '50%' } },
        { name: 'phone', type: 'text', label: 'Số điện thoại', required: true, admin: { width: '50%' } },
      ],
    },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'message', type: 'textarea', label: 'Lời nhắn' },
    {
      name: 'productInterest',
      type: 'text',
      label: 'Sản phẩm quan tâm',
      admin: { description: 'Slug sản phẩm quan tâm, vd: mkt-zalo.' },
    },
    {
      name: 'sourceSlug',
      type: 'text',
      label: 'Nguồn (slug trang)',
      admin: { description: 'Slug trang phát sinh lead (vd case study).' },
    },
    { name: 'utm', type: 'json', label: 'UTM', admin: { description: 'utm_source/medium/campaign...' } },
    {
      name: 'status',
      type: 'select',
      label: 'Trạng thái',
      defaultValue: 'new',
      options: [
        { label: 'Mới', value: 'new' },
        { label: 'Đã liên hệ', value: 'contacted' },
        { label: 'Chốt đơn', value: 'won' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
