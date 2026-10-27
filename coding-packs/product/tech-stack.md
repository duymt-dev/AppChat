# AppChat — Tech Stack (authoritative)

> Chủ nhà chốt 2026-10-27: **build lại hoàn toàn bằng Next.js + NestJS**. Không tái sử dụng codebase V1.
> Các lớp khác lấy từ CTO Architecture v4.2 §09, điều chỉnh cho MVP. Những mục ghi *(chốt ở RRI)* là còn mở.

| Lớp | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript strict (FE + BE), monorepo *(công cụ — chốt ở RRI: pnpm workspaces / Turborepo / Nx)* |
| Frontend | Next.js (App Router), React, TanStack Query, design tokens từ Design System, i18n (next-intl, mặc định `vi`) |
| Backend | NestJS — modular monolith (module = bounded context) + worker process riêng cho Channel Gateway & AI inference |
| API | REST `/v1`, OpenAPI 3.1 (contract-first), cursor pagination, `Idempotency-Key`, lỗi `{error:{code,message,fields}}` |
| Database | PostgreSQL 16 + Row-Level Security theo `workspace_id` + pgvector (HNSW) + unaccent/pg_trgm (tìm kiếm tiếng Việt) |
| ORM / migration | *(chốt ở RRI: Prisma / Drizzle / TypeORM / Kysely)* — migration versioned, không sửa migration đã merge |
| Cache / Queue | Redis + BullMQ; outbox pattern; Kafka/Redpanda khi scale *(chốt ở RRI)* |
| Realtime | WebSocket (Socket.IO hoặc ws gateway của Nest) + SSE fallback |
| Storage | S3-compatible (MinIO local / AWS S3) |
| LLM | Claude Haiku / Sonnet / Opus, routing theo tác vụ/chi phí, streaming; Agent Gateway interface (để thay động cơ — OpenFang — sau) |
| Auth | OTP Zalo/Email + social OAuth; JWT ngắn hạn + refresh; RBAC theo workspace |
| Thanh toán | VietQR / Napas 247 (IPN), chuyển khoản thủ công có đối soát |
| Test | Vitest/Jest (unit), Testcontainers (integration), Playwright (e2e), RLS isolation test, k6 (load) |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki |
| Infra / CI | Docker Compose (dev) → K8s + Helm (prod); GitHub Actions |
| Font / UI | Plus Jakarta Sans 300–800, JetBrains Mono; primary #2DC56A; icon 24px stroke (Lucide-style) |
