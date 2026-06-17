import type { CheckboxField, TextField } from 'payload'

import { formatSlugHook } from './formatSlug'

/**
 * Field `slug` tự sinh từ field nguồn (mặc định `title`) NGAY khi gõ trong admin,
 * kèm nút "Mở khoá" để sửa tay. Trả về [slug, slugLock] → dùng spread trong collection:
 *   fields: [ ..., ...slugField('title') ]
 */
export const slugField = (fieldToUse = 'title'): [TextField, CheckboxField] => {
  // Cờ ẩn: bật = đang tự sinh (khoá), tắt = người dùng tự sửa.
  const checkBoxField: CheckboxField = {
    name: 'slugLock',
    type: 'checkbox',
    defaultValue: true,
    admin: {
      hidden: true,
      position: 'sidebar',
    },
  }

  const slugFieldConfig: TextField = {
    name: 'slug',
    type: 'text',
    label: 'Đường dẫn (slug)',
    index: true,
    required: true,
    unique: true,
    hooks: {
      // Vẫn chuẩn hoá/sinh slug ở server (an toàn cả khi tạo qua API).
      beforeValidate: [formatSlugHook(fieldToUse)],
    },
    admin: {
      position: 'sidebar',
      description: 'Tự sinh từ tiêu đề khi gõ. Bấm "Mở khoá" để sửa tay.',
      components: {
        Field: {
          path: '/fields/slug/SlugComponent#SlugComponent',
          clientProps: { fieldToUse, checkboxFieldPath: checkBoxField.name },
        },
      },
    },
  }

  return [slugFieldConfig, checkBoxField]
}
