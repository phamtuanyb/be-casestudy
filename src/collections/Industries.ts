import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '../access'
import { slugField } from '../fields/slug'

export const Industries: CollectionConfig = {
  slug: 'industries',
  labels: { singular: 'Ngành', plural: 'Ngành' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order'],
    group: 'Danh mục',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', label: 'Tên ngành', required: true },
    ...slugField('name'),
    { name: 'order', type: 'number', label: 'Thứ tự', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
}
