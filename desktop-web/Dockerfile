# Build Stage
FROM node:22-alpine AS build-stage

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Accept build argument and set as environment variable for Vite
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# Production Stage
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist/spa /usr/share/nginx/html
# Default nginx config is usually fine for SPA if try_files is set,
# but let's provide a simple config to handle SPA routing if needed.
# For now, default might work for index, but SPA routing requires try_files $uri $uri/ /index.html
# We will inject a simple config.
RUN echo 'server { \
  listen 80; \
  location / { \
  root /usr/share/nginx/html; \
  index index.html index.htm; \
  try_files $uri $uri/ /index.html; \
  } \
  location /api/ { \
  proxy_pass http://backend:3000/; \
  proxy_http_version 1.1; \
  proxy_set_header Upgrade $http_upgrade; \
  proxy_set_header Connection "upgrade"; \
  proxy_set_header Host $http_host; \
  proxy_set_header X-Real-IP $remote_addr; \
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
  proxy_set_header X-Forwarded-Proto $scheme; \
  proxy_set_header X-Forwarded-Host $http_host; \
  proxy_buffering on; \
  proxy_buffer_size 16k; \
  proxy_buffers 8 32k; \
  proxy_busy_buffers_size 64k; \
  proxy_cache_valid 200 1m; \
  } \
  }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
