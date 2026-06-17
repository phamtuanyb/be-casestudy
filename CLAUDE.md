# CLAUDE.md — Backend "Proof Engine" (Payload Headless API)

> Đây là **repo BACKEND** của hệ MKT Showcase. Vai trò: API + CMS headless, là **proof-engine dùng lại được cho nhiều frontend/vertical** (showcase, BĐS, du lịch...). KHÔNG render trang công khai ở đây — chỉ phục vụ API + admin.
>
> Repo này đi cặp với repo FRONTEND (xem `CLAUDE.md` bên đó) và tuân theo **API Contract** chung (`API-Contract.md`). Đọc cả 3 file trước khi code.

---

## CÁCH DÙNG (cho Phạm Tuân)
1. Tạo thư mục riêng cho backend (vd `mkt-proof-api/`), đặt file này tên `CLAUDE.md` ở gốc.
2. Mở VS Code → Claude Code → gõ:
   > "Đọc CLAUDE.md và API-Contract.md. Bắt đầu **B0**. Xong **DỪNG**, báo cáo + cách kiểm tra, chờ duyệt."
3. Duyệt xong gõ tiếp "Làm B1", "B2"...

## 1. VAI TRÒ & MỤC TIÊU
- Quản trị nội dung (case study, video, testimonial, stat, logo, lead) qua admin `/admin`.
- Expose **REST + GraphQL API** cho frontend đọc nội dung đã publish.
- Nhận **lead** từ frontend (ghi DB + gửi email).
- Khi publish nội dung → **bắn webhook revalidate** sang frontend.
- Thiết kế để **nhiều frontend dùng chung** (multi-origin).

## 2. STACK (CHỐT — KHÔNG ĐỔI)
- **Payload CMS 3** (headless) chạy độc lập.
- **TypeScript**.
- **DB:** SQLite local/dev · PostgreSQL production (db-adapter của Payload, **không Prisma**).
- **Email:** Resend (thông báo lead).
- Auto REST tại `/api/*`, GraphQL tại `/api/graphql`.
- Trước khi cài: **kiểm tra lệnh/cú pháp Payload mới nhất từ docs chính thức** rồi mới chạy (cú pháp access/cors/hook có thể đổi theo phiên bản).

## 3. QUY TẮC BẮT BUỘC
1. **Đây là headless** — không tạo trang public ở repo này.
2. **Access control nghiêm:** public chỉ đọc được nội dung `published = true`; ghi/sửa chỉ user đăng nhập; Leads chỉ admin đọc, public chỉ được create.
3. **API key cho server-to-server** — frontend đọc API qua service token, không mở toàn bộ API ẩn danh.
4. **CORS/CSRF chỉ cho origin tin cậy** (lấy từ env, hỗ trợ nhiều origin cho nhiều vertical).
5. **Không commit secret** — tất cả trong `.env` + có `.env.example`.
6. Làm theo module B0→B3, **xong mỗi B thì DỪNG** báo cáo, không tự nhảy bước.
7. Tự chạy build/lint trước khi báo cáo.

## 4. DATA MODEL — COLLECTIONS
(Trùng định nghĩa field với API Contract — đây là nguồn chân lý của schema.)
- **Products**: `name, slug, tagline, icon, color, order`
- **Industries**: `name, slug, order`
- **CaseStudies**: `title, slug, quote, problem(richText), solution(richText), result(richText), customerName, customerRole, customerAvatar(upload), coverImage(upload), coverColor(text — màu hoặc gradient CSS), metrics(array {value,label}), industry(rel), products(rel hasMany — phần tử đầu là sản phẩm chính), featured, published, publishedAt, order, seoTitle, seoDescription`
  > Khớp thiết kế: trang chi tiết cần 3 khối **problem/solution/result** (Vấn đề/Giải pháp/Kết quả); FE lấy `bigValue=metrics[0]`, `product=products[0]`, `coverBg=coverColor`.
- **VideoReviews**: `title, slug, description, youtubeId, category(select), durationLabel, thumbnailColor, industry(rel), products(rel hasMany), featured, published, order`
- **Testimonials**: `content, customerName, customerRole, rating(1-5), published, order`
- **StatItems**: `value(number), suffix, label, order`
- **CustomerLogos**: `name, logo(upload), order`
- **Leads**: `name, phone, email, message, productInterest, sourceSlug, utm(json), status(select new/contacted/won), createdAt`
- **Users** (auth): role `editor` (CRUD nội dung) / `admin` (toàn quyền). Bật **API key** cho user `service` để frontend dùng.

## 5. ACCESS CONTROL (quy tắc)
- Mọi collection nội dung: `read` = public **nhưng lọc `published=true`** (trừ khi req.user thì thấy hết); `create/update/delete` = chỉ user đăng nhập.
- **Leads**: `create` = public (cho phép frontend gửi); `read/update` = chỉ admin; `delete` = admin.
- **Users**: chỉ admin quản lý.

## 6. LỘ TRÌNH BUILD (DỪNG sau mỗi B)

### B0 — Khởi tạo Payload headless
- Khởi tạo project Payload + TypeScript, DB SQLite local; `.env` + `.env.example`; chạy được admin.
- **Nghiệm thu:** `npm run dev` → `/admin` tạo tài khoản admin & đăng nhập; `/api/access` phản hồi.
- **DỪNG.**

### B1 — Collections & Access control & Roles
- Khai báo toàn bộ collections mục 4; access control mục 5; role `editor`/`admin`; upload ảnh; field `metrics` array.
- Viết **seed**: 6 sản phẩm MKT + vài ngành + 2 case + 2 video + 1 user `service` (có API key).
- **Nghiệm thu:** Tạo nội dung qua admin OK; gọi `GET /api/case-studies` ẩn danh chỉ trả doc `published`; role editor không sửa được Users.
- **DỪNG.**

### B2 — API exposure: Auth + CORS + Lead + Rate-limit
- Bật & kiểm tra REST + GraphQL. Cấu hình **CORS + CSRF** đọc từ `CORS_ORIGINS` (hỗ trợ nhiều origin).
- Bật **API key auth** cho server-to-server (frontend gọi đọc bằng token của user `service`).
- Endpoint nhận lead: dùng `POST /api/leads` (public create) **có rate-limit cơ bản** + honeypot field; chuẩn payload theo API Contract.
- **Nghiệm thu:** Gọi `GET /api/case-studies` kèm header API key OK; gọi từ origin lạ bị CORS chặn; `POST /api/leads` tạo lead; spam quá ngưỡng bị chặn.
- **DỪNG.**

### B3 — Webhook revalidate + Email + Deploy
- Hook `afterChange` trên CaseStudies/VideoReviews/Testimonials/StatItems/CustomerLogos: khi `published` thay đổi → `POST` tới `FE_REVALIDATE_URL` kèm `REVALIDATE_SECRET` + path/tag liên quan (theo API Contract).
- Hook `afterChange` trên Leads: gửi email Resend tới `LEAD_NOTIFY_EMAIL`.
- Cấu hình production (Postgres), hướng dẫn deploy.
- **Nghiệm thu:** Publish 1 case → FE nhận webhook (log); tạo lead → email về.
- **DỪNG. → Bàn giao BE.**

## 7. BIẾN MÔI TRƯỜNG (`.env`)
```
DATABASE_URI=file:./mkt.db                 # prod: postgres://...
PAYLOAD_SECRET=
PAYLOAD_PUBLIC_SERVER_URL=https://api.casestudy.mktsoftware.vn
CORS_ORIGINS=https://casestudy.mktsoftware.vn,http://localhost:3001   # nhiều origin, phân tách dấu phẩy
CSRF_ORIGINS=https://casestudy.mktsoftware.vn,http://localhost:3001
FE_REVALIDATE_URL=https://casestudy.mktsoftware.vn/api/revalidate
REVALIDATE_SECRET=
RESEND_API_KEY=
LEAD_NOTIFY_EMAIL=sale@mktsoftware.vn
```

## 8. LỆNH
```bash
npm run dev      # admin + API local
npm run build
npm run seed     # nạp dữ liệu mẫu + tạo user service (tạo ở B1)
```
