# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# VITE_API_URL is injected at build time so the compiled JS knows where the
# API lives. Default works for same-host deployments (browser → localhost:8000).
ARG VITE_API_URL=http://127.0.0.1:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: serve ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html/cube2
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
