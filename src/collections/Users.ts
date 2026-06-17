import type { CollectionConfig } from 'payload'

import { hasRole, isAdmin, isAdminField } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Người dùng', plural: 'Người dùng' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'roles'],
    group: 'Hệ thống',
  },
  // Bật API key để user `service` cho frontend gọi server-to-server.
  auth: {
    useAPIKey: true,
  },
  access: {
    // Admin xem mọi user; user thường chỉ xem chính mình (cho trang Account).
    read: ({ req: { user } }) => {
      if (hasRole(user, 'admin')) return true
      if (user) return { id: { equals: user.id } }
      return false
    },
    // Chỉ admin quản lý user.
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
    // Chỉ nhân viên nội bộ (admin/editor) được đăng nhập admin panel.
    // User `service` chỉ dùng API key, không vào panel.
    admin: ({ req: { user } }) => hasRole(user, 'admin') || hasRole(user, 'editor'),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Họ tên',
    },
    {
      name: 'roles',
      type: 'select',
      label: 'Vai trò',
      hasMany: true,
      required: true,
      defaultValue: ['admin'],
      options: [
        { label: 'Admin (toàn quyền)', value: 'admin' },
        { label: 'Editor (CRUD nội dung)', value: 'editor' },
        { label: 'Service (API key, chỉ đọc)', value: 'service' },
      ],
      // Chỉ admin được gán/sửa role → editor không tự nâng quyền.
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: 'User đầu tiên nên là admin. Service dùng cho frontend đọc API.',
      },
    },
  ],
}
