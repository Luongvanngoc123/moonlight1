# Deploy lên Vercel + Render (Miễn phí 100%)

## Tổng quan

- **Frontend**: Vercel (100GB bandwidth/month miễn phí)
- **Backend**: Render (750 giờ/tháng miễn phí)

## Bước 1: Deploy Backend lên Render

### 1.1. Tạo tài khoản Render

- Truy cập: https://render.com
- Sign up with GitHub

### 1.2. Tạo Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repo: `Luongvanngoc123/moonlight1`
3. Cấu hình:
   - **Name**: `moonlight1-backend`
   - **Region**: Singapore (gần VN nhất)
   - **Branch**: `main`
   - **Root Directory**: `server-helper`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. Click **"Create Web Service"**

### 1.3. Lấy URL Backend

Sau khi deploy xong, copy URL dạng:

```
https://moonlight1-backend.onrender.com
```

## Bước 2: Deploy Frontend lên Vercel

### 2.1. Tạo tài khoản Vercel

- Truy cập: https://vercel.com
- Sign up with GitHub

### 2.2. Import Project

1. Click **"Add New..."** → **"Project"**
2. Import repo: `Luongvanngoc123/moonlight1`
3. Cấu hình:
   - **Framework Preset**: Vite
   - **Root Directory**: `desktop-web`
   - **Build Command**: `pnpm install && pnpm build`
   - **Output Directory**: `dist/spa`

### 2.3. Thêm Environment Variables

Trong phần **Environment Variables**, thêm:

```
VITE_API_URL=https://moonlight1-backend.onrender.com
FIREBASE_CONFIG={"apiKey":"AIzaSyAr-RPrq5e1zURGdWT7ChDosaVI7Ttv-ng","authDomain":"animevietsub-ce559.firebaseapp.com","projectId":"animevietsub-ce559","storageBucket":"animevietsub-ce559.firebasestorage.app","messagingSenderId":"338120444054","appId":"1:338120444054:web:3a78ad604e57c36df79ab7","measurementId":"G-8B4Z7EN7QM"}
SUPABASE_URL=https://iwunbzfmfsgwpqdrdmeq.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dW5iemZtZnNnd3BxZHJkbWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTY0NTYsImV4cCI6MjA4NDc3MjQ1Nn0.gtX8i6akbUfA0fEXlHhphS9C_zwCWB2jk5Fg2ZGjQns
```

4. Click **"Deploy"**

## Bước 3: Trỏ Domain (Optional)

### Vercel:

- Settings → Domains → Add Domain
- Miễn phí SSL

### Render:

- Settings → Custom Domain
- Miễn phí SSL

## Lưu ý quan trọng

⚠️ **Render Free Tier:**

- App **sleep sau 15 phút** không dùng
- Lần đầu truy cập sau khi sleep: **cold start ~30s**
- Giải pháp: Dùng cron job ping mỗi 10 phút (cron-job.org)

⚠️ **Nếu vẫn bị 403:**
Backend Render có IP Singapore → có thể vẫn bị block. Cần:

1. Dùng proxy VN (trả phí)
2. Hoặc host backend trên VPS VN

## So sánh với VPS

| Tính năng      | Vercel+Render | VPS         |
| -------------- | ------------- | ----------- |
| **Chi phí**    | $0            | $5-10/tháng |
| **SSL**        | Auto free     | Phải config |
| **CDN**        | Global        | Không       |
| **Cold start** | ~30s          | Không       |
| **IP block**   | Có thể        | Có thể      |

## Update code sau này

```bash
git add .
git commit -m "Update features"
git push
```

Vercel và Render sẽ **auto-deploy** khi có push mới! 🚀
