# Hướng dẫn Triển khai lên VPS

Dưới đây là các bước để đưa website lên VPS sử dụng Docker.

## 1. Chuẩn bị VPS

Đảm bảo VPS của bạn đã cài đặt các phần mềm sau:

- **Docker**: [Hướng dẫn cài đặt](https://docs.docker.com/engine/install/)
- **Git** (nếu bạn muốn clone code trực tiếp)

## 2. Copy mã nguồn lên VPS

Bạn có 2 cách để đưa code lên VPS:

### Cách 1: Dùng Git (Khuyên dùng)

Nếu bạn đã đẩy code lên GitHub/GitLab:

```bash
git clone https://github.com/username/repo-cua-ban.git /app
cd /app
```

### Cách 2: Upload thủ công (Không cần Git)

Nếu bạn không dùng Git, hãy copy thư mục code từ máy tính lên VPS.

- Dùng phần mềm như **WinSCP** hoặc **FileZilla**.
- Kết nối SFTP vào VPS.
- Kéo thả toàn bộ thư mục dự án vào thư mục `/app` trên VPS.
- **QUAN TRỌNG**: Hãy **BỎ QUA** (không copy) các thư mục sau để tiết kiệm thời gian upload:
  - `node_modules` (Rất nặng, Docker sẽ tự cài lại)
  - `.git` (Không cần thiết)
  - `dist` hoặc `.output` (Docker sẽ tự build lại)
  - `.vscode`, `.idea` (Cấu hình IDE cá nhân)

Cấu trúc thư mục trên VPS sau khi copy sẽ trông như sau:

```
/app
├── desktop-web/
│   ├── Dockerfile
│   ├── package.json
│   └── ... (source code)
├── server-helper/
│   ├── Dockerfile
│   ├── package.json
│   └── ... (source code)
└── docker-compose.yml
```

## 3. Chạy ứng dụng

Tại thư mục chứa file `docker-compose.yml`, chạy lệnh sau:

```bash
docker compose up -d --build
```

- Lệnh này sẽ tự động build cả Frontend và Backend, sau đó chạy chúng dưới nền (detached mode).
- Quá trình build lần đầu có thể mất vài phút.

## 4. Kiểm tra

- Truy cập vào IP của VPS (hoặc domain) để xem trang web: `http://IP-CUA-BAN`
- Web frontend sẽ chạy ở Port 80 (mặc định HTTP).
- Backend API được truy cập qua Nginx reverse proxy tại `/api/*` (người dùng không cần truy cập trực tiếp port 3000).

**Kiến trúc:**

```
Browser → http://IP:80/ → Nginx → Frontend (SPA)
Browser → http://IP:80/api/* → Nginx → Backend :3000 (reverse proxy)
```

Nhờ reverse proxy, frontend và backend cùng origin, **không bị lỗi CORS**.

## 5. Cập nhật mới

Khi bạn sửa code và muốn cập nhật lên VPS:

1. Upload code mới lên.
2. Chạy lại lệnh:
   ```bash
   docker compose up -d --build
   ```
   Docker sẽ chỉ build lại những phần thay đổi.

## 7. Bảo mật & Chống Block IP (Khuyên dùng)

Để bảo vệ VPS khỏi tấn công và giấu IP gốc:

1.  **Sử dụng Cloudflare (Miễn phí)**: Trỏ domain của bạn qua Cloudflare trước khi về VPS. Cloudflare sẽ giúp chống DDoS và ẩn IP thật.
2.  **Proxy**: Nếu server của bạn cần lấy dữ liệu từ các nguồn bên ngoài, hãy xem xét cấu hình Proxy nếu bị chặn.

Chúc bạn thành công! 🚀
