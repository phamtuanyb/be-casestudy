# API Contract — MKT Showcase (BE ↔ FE)

> "Hợp đồng" chung giữa **Backend (Payload headless)** và **Frontend (Next.js)**. Cả hai repo phải tuân theo file này. Khi đổi schema/endpoint → cập nhật file này TRƯỚC, rồi đồng bộ 2 bên.

---

## 1. Tổng quan
- **Base URL (prod):** `https://api.casestudy.mktsoftware.vn`
- **REST:** `GET/POST /api/{collection}` (Payload auto-gen).
- **GraphQL:** `/api/graphql` (tùy chọn, FE chính dùng REST).
- **Định dạng:** JSON, UTF-8.
- FE đọc nội dung **server-side** kèm API key; browser **không** gọi thẳng API.

## 2. Xác thực (Auth)

### 2.1 Server-to-server (FE đọc nội dung)
- Dùng **API key** của user `service` (role hạn chế, chỉ đọc).
- Header:
  ```
  Authorization: users API-Key <API_SERVICE_TOKEN>
  ```
  > ✅ **Đã xác nhận trên Payload 3.85.1** (B2): format là `{collectionSlug} API-Key {key}`, ở đây collection auth là `users` nên header chính xác là `Authorization: users API-Key <key>`. Token này là API key của user `service` (role chỉ đọc).
- Token lưu ở env FE `API_SERVICE_TOKEN` — **chỉ server-side**, không `NEXT_PUBLIC_`.

### 2.2 Admin/Editor (quản trị nội dung)
- Đăng nhập qua `/admin` (Payload auth, cookie httpOnly + JWT). Không liên quan FE công khai.

### 2.3 Public create (gửi lead)
- `POST /api/leads` cho phép ẩn danh tạo (access `create: () => true`) nhưng:
  - FE gọi qua **proxy nội bộ** `/api/lead` (validate + rate-limit + honeypot).
  - BE có rate-limit cơ bản + field honeypot để chống spam.

## 3. CORS & CSRF
- BE chỉ chấp nhận origin trong `CORS_ORIGINS` (đọc từ env, **nhiều origin**, phân tách dấu phẩy) — phục vụ nhiều vertical dùng chung engine.
- `CSRF_ORIGINS` liệt kê domain tin cậy.
- Origin lạ → bị chặn. Local dev thêm `http://localhost:3001` (FE) vào env.

## 4. Endpoints FE tiêu thụ (READ)

Tham số chung (Payload REST): `?where[field][op]=value&limit=&page=&sort=&depth=`

| Mục đích | Request |
|---|---|
| Danh sách case (published) | `GET /api/case-studies?where[published][equals]=true&sort=order&depth=1&limit=100` |
| Lọc theo sản phẩm | thêm `&where[products.slug][equals]=mkt-zalo` |
| Lọc theo ngành | thêm `&where[industry.slug][equals]=my-pham` |
| Case theo slug | `GET /api/case-studies?where[slug][equals]={slug}&depth=2&limit=1` |
| Case nổi bật | `&where[featured][equals]=true` |
| Danh sách video | `GET /api/video-reviews?where[published][equals]=true&sort=order` |
| Testimonials | `GET /api/testimonials?where[published][equals]=true&sort=order` |
| Stat items | `GET /api/stat-items?sort=order` |
| Logo KH | `GET /api/customer-logos?sort=order` |
| Sản phẩm / ngành (cho filter) | `GET /api/products?sort=order` · `GET /api/industries?sort=order` |

> Khuyến nghị: FE bọc các call này trong `lib/api.ts` thành hàm typed (vd `getCaseStudies({product, industry})`, `getCaseBySlug(slug)`), không rải URL khắp nơi.

### Shape phản hồi REST (Payload chuẩn)
```jsonc
{
  "docs": [ /* mảng document */ ],
  "totalDocs": 12, "limit": 100, "page": 1, "totalPages": 1,
  "hasNextPage": false
}
```

### Shape `CaseStudy` (depth=1)
```jsonc
{
  "id": "…",
  "title": "Tự động chăm sóc 5.000 khách Zalo, x3 đơn lặp lại",
  "slug": "shop-my-pham-mkt-zalo",
  "quote": "Trước đây 3 nhân viên...",
  // 3 khối nội dung cho trang chi tiết (khớp thiết kế: Vấn đề / Giải pháp / Kết quả)
  "problem": { /* richText */ },
  "solution": { /* richText */ },
  "result": { /* richText */ },
  "customerName": "Chị Ngọc",
  "customerRole": "Chủ shop mỹ phẩm, Hà Nội",
  "customerAvatar": { "url": "…" } | null,
  "coverImage": { "url": "…" } | null,
  "coverColor": "linear-gradient(150deg,#0D47A1,#1565C0)",  // màu HOẶC gradient CSS (FE dùng làm coverBg)
  "metrics": [ { "value": "x3", "label": "đơn lặp lại" }, { "value": "-70%", "label": "thời gian rep" } ],
  // FE: bigValue = metrics[0].value ; product (đơn) = products[0].name
  "industry": { "id":"…","name":"Mỹ phẩm","slug":"my-pham" },
  "products": [ { "id":"…","name":"MKT Zalo","slug":"mkt-zalo","color":"#1E88E5" } ],
  "featured": true, "published": true, "order": 1,
  "seoTitle": "…", "seoDescription": "…"
}
```
> **Khớp thiết kế:** trang chi tiết bind `detailCase.body.problem/solution/result` ← `problem/solution/result`; thẻ case bind `c.product` ← `products[0].name`, `c.bigValue` ← `metrics[0].value`, `c.coverBg` ← `coverColor`. Xem bảng map đầy đủ ở `CLAUDE-frontend.md` mục 2.4.

### Shape `VideoReview`
```jsonc
{
  "id":"…","title":"Chị Ngọc review MKT Zalo sau 3 tháng","slug":"…",
  "description":"…","youtubeId":"abc123","category":"danh-gia",
  "durationLabel":"4:12","thumbnailColor":"#0D47A1",
  "industry":{…},"products":[…],"featured":true,"published":true,"order":1
}
```
`category` ∈ `danh-gia | huong-dan | phong-van | case-study`.

## 5. Tạo Lead (WRITE)

**FE proxy → BE.** FE route `/api/lead` nhận từ form, validate, đính kèm nguồn rồi gọi:
```
POST {API_BASE_URL}/api/leads
Authorization: users API-Key <token>
Content-Type: application/json
```
Body:
```jsonc
{
  "name": "Nguyễn Văn A",          // bắt buộc
  "phone": "0901234567",           // bắt buộc
  "email": "a@example.com",        // tùy chọn
  "message": "…",                  // tùy chọn
  "productInterest": "mkt-zalo",   // tùy chọn
  "sourceSlug": "shop-my-pham-mkt-zalo",  // FE tự đính khi submit từ trang case
  "utm": { "source":"zalo","medium":"share","campaign":"…" },
  "_hp": ""                        // honeypot: phải rỗng, có giá trị => bỏ qua (spam)
}
```
Phản hồi thành công: `201` + `{ "doc": { "id": "…" } }`.
BE hook `afterChange` → gửi email tới `LEAD_NOTIFY_EMAIL`.

## 6. Revalidate Webhook (BE → FE)

Khi nội dung publish/unpublish, BE gọi:
```
POST {FE_REVALIDATE_URL}
Content-Type: application/json
{
  "secret": "<REVALIDATE_SECRET>",
  "collection": "case-studies",
  "slug": "shop-my-pham-mkt-zalo"   // nếu có
}
```
FE `/api/revalidate`:
- Kiểm tra `secret` khớp `REVALIDATE_SECRET` → nếu sai trả `401`.
- Revalidate path liên quan: `/`, `/cau-chuyen`, `/cau-chuyen/{slug}` (hoặc dùng tag-based revalidation).

## 7. Quy ước chung
- **Slug** tiếng Việt **không dấu**, dùng `-` (vd `shop-my-pham-mkt-zalo`).
- Thời gian: ISO 8601 UTC.
- Ảnh: BE trả URL tuyệt đối; FE dùng `next/image` (nhớ cấu hình `remotePatterns` cho domain ảnh BE).
- Phân trang: mặc định `limit=100` đủ cho lượng case hiện tại; nếu vượt → FE paginate.
- **Bảo mật:** không đặt dữ liệu cá nhân/secret trong query string; lead chỉ gửi tới BE của MKT.

## 8. Checklist khớp BE-FE
- [ ] FE gọi đúng endpoint + lọc `published=true`.
- [ ] Token chỉ ở server-side, header đúng format đã xác nhận.
- [ ] CORS chặn origin lạ, cho phép origin FE.
- [ ] Lead tạo được kèm `sourceSlug` + UTM; honeypot chặn spam.
- [ ] Webhook revalidate hoạt động 2 chiều (secret khớp).
- [ ] Types FE khớp shape mục 4–5.
