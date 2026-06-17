import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { revalidateAfterChange, revalidateAfterDelete } from './hooks/revalidate'

export const CustomerLogos: CollectionConfig = {
  slug: 'customer-logos',
  labels: { singular: 'Logo khách hàng', plural: 'Logo khách hàng' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'order'],
    group: 'Nội dung',
  },
  access: {
    read: anyone,
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
    { name: 'name', type: 'text', label: 'Tên khách hàng', required: true },
    { name: 'logo', type: 'upload', label: 'Logo', relationTo: 'media' },
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
