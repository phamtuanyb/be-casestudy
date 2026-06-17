# Hướng dẫn Deploy — MKT Showcase (BE + FE)

Master guide deploy cả hệ thống lên **Git** rồi lên **VPS (Ubuntu)**.
Kiến trúc: 1 VPS chạy 2 app Node + Postgres + Nginx (reverse proxy) + SSL.

```
                    Internet (HTTPS)
                          │
                    ┌─────┴─────┐  Nginx (443) + Let's Encrypt
                    │           │
   casestudy.mktsoftware.vn   api.casestudy.mktsoftware.vn
        (Frontend)                  (Backend / Admin + API)
     Next.js :3001                Payload :3000  ──► PostgreSQL
```

- **Backend** (repo `be-casestudy`): Payload headless — admin `/admin` + REST/GraphQL `/api/*`. Cổng nội bộ **3000**.
- **Frontend** (repo `fe-casestudy`): Next.js website. Cổng nội bộ **3001**.
- Hai bên nối nhau bằng: **API key** (FE đọc nội dung BE) + **REVALIDATE_SECRET** (BE báo FE build lại) + **CORS** (BE chỉ cho FE gọi).

---

## PHẦN A — Đẩy code lên Git

> Làm cho **cả 2 repo** (`be-casestudy` và `fe-casestudy`), mỗi repo 1 repository GitHub riêng.

### A1. Kiểm tra an toàn (QUAN TRỌNG — đừng lộ secret)
`.gitignore` đã chặn `.env`, `node_modules`, `.next`, `*.db`, `/media`. Xác nhận lại:
```bash
cd be-casestudy
git init
git add -A
git status --short | grep -i "\.env$" && echo "CẢNH BÁO: .env bị track!" || echo "OK: .env không bị commit"
```
> Chỉ `.env.example` được commit, **không** commit `.env` thật. Nếu lỡ thấy `.env` trong `git status`, kiểm tra lại `.gitignore`.

### A2. Commit & push (lặp lại cho cả 2 repo)
```bash
# --- Backend ---
cd be-casestudy
git init
git branch -M main
git add -A
git commit -m "Initial commit: Payload headless proof-engine (B0-B3)"
git remote add origin git@github.com:<user>/mkt-proof-api.git   # tạo repo trống trên GitHub trước
git push -u origin main

# --- Frontend ---
cd ../fe-casestudy
git init
git branch -M main
git add -A
git commit -m "Initial commit: MKT Showcase web (Next.js)"
git remote add origin git@github.com:<user>/mkt-casestudy-web.git
git push -u origin main
```
> Dùng HTTPS thay SSH thì remote là `https://github.com/<user>/<repo>.git` (sẽ hỏi token).

---

## PHẦN B — Chuẩn bị VPS (Ubuntu 22.04)

SSH vào VPS với user có sudo.

### B1. Cài Node 20, Git, Nginx, PM2
```bash
sudo apt update && sudo apt -y upgrade
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs git nginx
sudo npm i -g pm2
node -v   # >= 20
```

### B2. Cài PostgreSQL + tạo database
```bash
sudo apt -y install postgresql postgresql-contrib
sudo -u postgres psql <<'SQL'
CREATE DATABASE mkt;
CREATE USER mkt_user WITH ENCRYPTED PASSWORD 'doi-mat-khau-manh';
GRANT ALL PRIVILEGES ON DATABASE mkt TO mkt_user;
ALTER DATABASE mkt OWNER TO mkt_user;
SQL
```
→ `DATABASE_URI=postgres://mkt_user:doi-mat-khau-manh@localhost:5432/mkt`

### B3. (Khuyến nghị) Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### B4. Trỏ DNS
Tạo 2 bản ghi A trỏ về IP VPS:
| Tên | Loại | Giá trị |
|---|---|---|
| `casestudy` | A | `<IP VPS>` |
| `api.casestudy` | A | `<IP VPS>` |

---

## PHẦN C — Deploy Backend (Payload)

### C1. Tạo migration Postgres (làm 1 lần ở máy DEV trước khi deploy)
Dev đang dùng SQLite (auto-push). Production Postgres **dùng migrations**:
```bash
# Ở máy dev: tạm trỏ .env sang Postgres (local hoặc staging) rồi:
npm run migrate:create        # sinh file trong src/migrations/
git add src/migrations && git commit -m "Add initial Postgres migration" && git push
```
> Nếu chưa có Postgres ở máy dev: cài Postgres local, hoặc tạo migration ngay trên VPS sau bước C2 bằng `npm run migrate:create`.

### C2. Clone & cấu hình trên VPS
```bash
cd /var/www && sudo mkdir -p mkt && sudo chown $USER:$USER mkt && cd mkt
git clone git@github.com:<user>/mkt-proof-api.git be && cd be
cp .env.example .env
nano .env
```
Điền `.env` production:
```env
DATABASE_URI=postgres://mkt_user:doi-mat-khau-manh@localhost:5432/mkt
PAYLOAD_SECRET=<sinh chuỗi 32 byte>            # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PAYLOAD_PUBLIC_SERVER_URL=https://api.casestudy.mktsoftware.vn

CORS_ORIGINS=https://casestudy.mktsoftware.vn
CSRF_ORIGINS=https://casestudy.mktsoftware.vn

FE_REVALIDATE_URL=https://casestudy.mktsoftware.vn/api/revalidate
REVALIDATE_SECRET=<bí mật chung BE-FE>          # PHẢI khớp env FE

RESEND_API_KEY=<resend key>
RESEND_FROM_ADDRESS=no-reply@mktsoftware.vn      # email thuộc domain đã verify ở Resend
RESEND_FROM_NAME=MKT Showcase
LEAD_NOTIFY_EMAIL=sale@mktsoftware.vn
```

### C3. Build & chạy
```bash
npm ci
npm run migrate          # áp dụng schema vào Postgres
npm run build
npm run seed             # (tuỳ chọn) nạp dữ liệu mẫu + tạo user admin/editor/service
pm2 start "npm run start" --name mkt-be
pm2 save
```
> Sau `seed`: vào `/admin` **đổi mật khẩu** user mặc định, và **tạo API key service MỚI** (xem Phần E) — không dùng key dev.

Kiểm tra cục bộ: `curl -I http://localhost:3000/api/access` → 200.

---

## PHẦN D — Deploy Frontend (Next.js)

```bash
cd /var/www/mkt
git clone git@github.com:<user>/mkt-casestudy-web.git fe && cd fe
cp .env.example .env
nano .env
```
Điền `.env` FE:
```env
NEXT_PUBLIC_SITE_URL=https://casestudy.mktsoftware.vn
API_BASE_URL=https://api.casestudy.mktsoftware.vn      # URL Backend (server-side)
API_SERVICE_TOKEN=<API key user service của BE>        # lấy ở Phần E
REVALIDATE_SECRET=<bí mật chung — KHỚP với BE>
```
```bash
npm ci
npm run build
pm2 start "npm run start" --name mkt-fe                # FE chạy next start -p 3001
pm2 save
pm2 startup        # chạy lệnh nó in ra để PM2 tự bật khi reboot
```

---

## PHẦN E — Kết nối BE ↔ FE (bảng đối chiếu env)

Đây là phần hay sai nhất. Các giá trị **phải khớp** giữa 2 bên:

| Mục đích | Backend (`be/.env`) | Frontend (`fe/.env`) | Quy tắc |
|---|---|---|---|
| FE đọc API của BE | API key user `service` | `API_SERVICE_TOKEN` | FE token = key của user service |
| BE cho FE gọi (CORS) | `CORS_ORIGINS` chứa domain FE | — | phải có `https://casestudy.mktsoftware.vn` |
| BE báo FE revalidate | `FE_REVALIDATE_URL` = domain FE `/api/revalidate` | — | trỏ đúng domain FE |
| Bảo mật revalidate | `REVALIDATE_SECRET` | `REVALIDATE_SECRET` | **giống hệt nhau** |
| FE biết URL BE | `PAYLOAD_PUBLIC_SERVER_URL` | `API_BASE_URL` | cùng trỏ `https://api.casestudy...` |

**Tạo API key service trên production:**
1. Vào `https://api.casestudy.mktsoftware.vn/admin` → **Người dùng** → user `service@...` (hoặc tạo mới role *Service*).
2. Bật **API Key** → copy key → dán vào `API_SERVICE_TOKEN` của FE.
3. FE ảnh BE: Next.js đã tự thêm domain `API_BASE_URL` vào `images.remotePatterns` → ảnh upload hiển thị qua HTTPS.

---

## PHẦN F — Nginx reverse proxy + SSL

### F1. Cấu hình site
```bash
sudo nano /etc/nginx/sites-available/mkt
```
```nginx
# Backend — api.casestudy.mktsoftware.vn
server {
  listen 80;
  server_name api.casestudy.mktsoftware.vn;
  client_max_body_size 25M;            # cho upload ảnh
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}

# Frontend — casestudy.mktsoftware.vn
server {
  listen 80;
  server_name casestudy.mktsoftware.vn;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/mkt /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
> `X-Forwarded-For` quan trọng: rate-limit lead của BE đọc IP thật từ header này.

### F2. SSL (Let's Encrypt)
```bash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d casestudy.mktsoftware.vn -d api.casestudy.mktsoftware.vn
# certbot tự sửa Nginx sang 443 + tự gia hạn
```

---

## PHẦN G — Checklist sau deploy

- [ ] `https://api.casestudy.mktsoftware.vn/api/access` → 200.
- [ ] `https://api.casestudy.mktsoftware.vn/admin` đăng nhập được; đã đổi pass mặc định.
- [ ] `https://casestudy.mktsoftware.vn` hiển thị nội dung (kéo từ BE qua API key).
- [ ] Ảnh upload (avatar/cover) hiển thị trên FE qua HTTPS.
- [ ] Origin lạ bị CORS chặn; `Authorization: users API-Key <key>` đọc API OK.
- [ ] Publish 1 case trong admin → FE revalidate (nội dung mới lên web sau ~vài giây).
- [ ] Submit form tư vấn trên FE → tạo lead trong admin + email về `LEAD_NOTIFY_EMAIL`.
- [ ] Reboot VPS → `pm2 list` thấy cả `mkt-be` và `mkt-fe` tự chạy lại.

---

## PHẦN H — Cập nhật / redeploy

```bash
# Backend
cd /var/www/mkt/be && git pull
npm ci && npm run migrate && npm run build
pm2 restart mkt-be

# Frontend
cd /var/www/mkt/fe && git pull
npm ci && npm run build
pm2 restart mkt-fe
```
> Có thể gói các lệnh này thành `deploy.sh` cho mỗi repo, hoặc dùng GitHub Actions SSH để tự động.

---

## PHẦN I — Ghi chú vận hành

- **Ảnh upload** lưu ở `/var/www/mkt/be/media` (local). Single VPS thì ổn; nếu scale nhiều instance/serverless → chuyển object storage (S3/R2) bằng `@payloadcms/storage-s3`. Khi redeploy **đừng xoá** thư mục `media`.
- **Rate-limit lead** in-memory (1 instance). Nhiều instance → thay bằng Redis trong `src/utils/rateLimit.ts`.
- **Backup DB**: `pg_dump mkt > backup-$(date +%F).sql` (đặt cron hàng ngày).
- **Log**: `pm2 logs mkt-be` / `pm2 logs mkt-fe`.
- **Postgres an toàn**: chỉ mở cổng 5432 nội bộ (localhost), không expose ra ngoài.
```
