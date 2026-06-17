import type { Access, FieldAccess } from 'payload'

export type Role = 'admin' | 'editor' | 'service'

/** User có chứa role chỉ định không (roles là mảng hasMany). */
export const hasRole = (user: unknown, role: Role): boolean => {
  const roles = (user as { roles?: string[] } | null)?.roles
  return Array.isArray(roles) && roles.includes(role)
}

/** Nhân viên nội bộ: admin hoặc editor (được vào admin panel + CRUD nội dung). */
export const isStaff = (user: unknown): boolean => hasRole(user, 'admin') || hasRole(user, 'editor')

// --- Access control cho collection ---

/** Ai cũng được (vd: public read danh mục, public create lead). */
export const anyone: Access = () => true

/** Chỉ user đã đăng nhập. */
export const authenticated: Access = ({ req: { user } }) => Boolean(user)

/** Chỉ admin. */
export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

/** Admin hoặc editor — dùng cho create/update/delete nội dung. */
export const isAdminOrEditor: Access = ({ req: { user } }) => isStaff(user)

/**
 * Read nội dung: staff (admin/editor) thấy tất cả; còn lại (service token + ẩn danh)
 * chỉ thấy doc đã `published = true`.
 */
export const publishedOrStaff: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true
  return { published: { equals: true } }
}

// --- Field-level access ---

/** Chỉ admin được sửa field (vd: roles, để editor không tự nâng quyền). */
export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')
