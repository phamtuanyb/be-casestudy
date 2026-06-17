import React from 'react'

const links: { href: string; label: string; icon: string }[] = [
  { href: '/admin/collections/case-studies', label: 'Case studies', icon: '📑' },
  { href: '/admin/collections/video-reviews', label: 'Video reviews', icon: '🎬' },
  { href: '/admin/collections/testimonials', label: 'Testimonials', icon: '💬' },
  { href: '/admin/collections/products', label: 'Sản phẩm', icon: '📦' },
  { href: '/admin/collections/leads', label: 'Leads', icon: '🎯' },
  { href: '/admin/collections/media', label: 'Thư viện ảnh', icon: '🖼️' },
]

/** Panel chào mừng phía trên dashboard — lấp khoảng trống & điều hướng nhanh. */
export const BeforeDashboard = () => (
  <div className="mkt-welcome">
    <h2 className="mkt-welcome__title">👋 Chào mừng tới MKT Showcase Admin</h2>
    <p className="mkt-welcome__desc">
      Trung tâm quản trị proof-engine: nội dung đã publish sẽ tự đồng bộ sang website. Chọn nhanh
      một mục để bắt đầu:
    </p>
    <ul className="mkt-welcome__links">
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href}>
            <span>{l.icon}</span>
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
)

export default BeforeDashboard
