# Deploy lên Railway (Miễn phí - $5 credit/tháng)

Railway host **cả Frontend + Backend** trong 1 service duy nhất!

## Ưu điểm Railway

- ✅ **1 nơi duy nhất** - không cần config riêng
- ✅ **$5 credit/tháng** (~500 giờ server)
- ✅ **Auto SSL** + custom domain
- ✅ **Không cold start** - luôn chạy
- ✅ **Git push → auto deploy**
- ✅ **DDoS protection cơ bản**

## Bước 1: Tạo tài khoản Railway

1. Truy cập: https://railway.app
2. Sign up with GitHub
3. **Không cần credit card** để bắt đầu

## Bước 2: Deploy Project

### 2.1. Tạo New Project

1. Click **"New Project"**
2. Chọn **"Deploy from GitHub repo"**
3. Select repo: **`Luongvanngoc123/moonlight1`**

### 2.2. Environment Variables

Trong **Variables** tab, thêm:

```
FIREBASE_CONFIG={"apiKey":"AIzaSyAr-RPrq5e1zURGdWT7ChDosaVI7Ttv-ng","authDomain":"animevietsub-ce559.firebaseapp.com","projectId":"animevietsub-ce559","storageBucket":"animevietsub-ce559.firebasestorage.app","messagingSenderId":"338120444054","appId":"1:338120444054:web:3a78ad604e57c36df79ab7","measurementId":"G-8B4Z7EN7QM"}

SUPABASE_URL=https://iwunbzfmfsgwpqdrdmeq.supabase.co

SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dW5iemZtZnNnd3BxZHJkbWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTY0NTYsImV4cCI6MjA4NDc3MjQ1Nn0.gtX8i6akbUfA0fEXlHhphS9C_zwCWB2jk5Fg2ZGjQns

VITE_API_URL=/api

NODE_ENV=production
```

### 2.3. Deploy Settings

Railway tự động detect:

- ✅ Build command: `npm run build` (từ `package.json`)
- ✅ Start command: `npm run start:railway`
- ✅ Port: 3000 (auto-detect từ code)

**Click "Deploy"** và chờ ~3-5 phút!

## Bước 3: Lấy Domain

Sau khi deploy xong:

1. Vào **Settings** tab
2. Copy **Public Domain**, ví dụ:
   ```
   https://moonlight1-production.up.railway.app
   ```
3. Truy cập domain này để xem site!

## Bước 4: Custom Domain (Optional)

Nếu có domain riêng:

1. Vào **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Nhập domain (vd: `anime.yoursite.com`)
4. Trỏ DNS:
   - Type: `CNAME`
   - Name: `anime` (hoặc `@` cho root)
   - Value: (Railway cung cấp)
5. SSL tự động kích hoạt sau 5-10 phút

## Bước 5: Bật Cloudflare (Khuyến nghị)

Để tăng cường DDoS protection:

1. Trỏ domain qua Cloudflare
2. Enable **Proxy** (orange cloud ☁️)
3. Settings → SSL/TLS → **Full**
4. Firewall → **Medium** security level

## Architecture

```
User
 ↓
Railway (Port 3000)
 ├─ Frontend (/)          → desktop-web/dist/spa
 ├─ API Proxy (/api/*)    → server-helper:3000
 └─ Backend (localhost)   → got-scraping + video decrypt
```

## Update Code

```bash
# Trên máy local
git add .
git commit -m "Update features"
git push
```

→ Railway **tự động deploy** sau vài giây!

## Monitor & Logs

- **Logs**: Xem real-time trong Railway dashboard
- **Metrics**: CPU, RAM, Network usage
- **Credits**: Track $5 monthly credit usage

## Troubleshooting

**Video không chạy / 403 Error:**

- Railway IP có thể bị `animevietsub.vip` block
- Giải pháp: Thêm proxy VN (cần trả phí)

**Build failed:**

- Check logs trong **Deployments** tab
- Verify environment variables đã đúng

**Out of credits:**

- Free tier: $5/tháng (~500 giờ)
- Nếu hết: Add payment method hoặc tối ưu code

## So sánh

| Tính năng  | Railway       | VPS         | Vercel+Render     |
| ---------- | ------------- | ----------- | ----------------- |
| Setup      | ⭐⭐⭐⭐⭐ Dễ | ⭐⭐ Khó    | ⭐⭐⭐ Trung bình |
| Chi phí    | $5 credit     | $5-10/tháng | Free              |
| DDoS       | Cơ bản        | Không       | Mạnh (Vercel)     |
| Cold start | Không         | Không       | Có (Render)       |
| Domain     | Free SSL      | Tự config   | Free SSL          |

Railway = **Sweet spot** giữa dễ dùng và performance! 🚂
