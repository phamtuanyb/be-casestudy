import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate'

export const StatItems: CollectionConfig = {
  slug: 'stat-items',
  labels: { singular: 'Chỉ số', plural: 'Chỉ số nổi bật' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value', 'suffix', 'order'],
    group: 'Nội dung',
  },
  access: {
    read: anyone, // số liệu tổng quan — public đọc hết
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
    { name: 'value', type: 'number', label: 'Giá trị', required: true },
    { name: 'suffix', type: 'text', label: 'Hậu tố', admin: { description: 'vd: +, %, K' } },
    { name: 'label', type: 'text', label: 'Nhãn', required: true },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
