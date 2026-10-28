# AppChat — Tech Stack (authoritative)

> Chủ nhà chốt 2026-10-27: **build lại hoàn toàn bằng Next.js + NestJS**. Không tái sử dụng codebase V1.
> Các lớp khác lấy từ CTO Architecture v4.2 §09, điều chỉnh theo RRI 2026-10-28 (D12–D15).

| Lớp | Lựa chọn |
|---|---|
| Ngôn ngữ | TypeScript strict (FE + BE), monorepo pnpm workspaces |
| Frontend | Next.js (App Router), React, TanStack Query, **Ant Design v6** (`antd` + `@ant-design/nextjs-registry` + `antd-style`) và **Ant Design X 2.x** cho Trợ lý AI; một codebase responsive desktop + mobile web; i18n (next-intl, mặc định `vi`) |
| Backend | NestJS — modular monolith (module = bounded context) + worker process riêng cho Channel Gateway & AI inference |
| API | REST `/v1`, OpenAPI 3.1 (contract-first), cursor pagination, `Idempotency-Key`, lỗi `{error:{code,message,fields}}` |
| Database | PostgreSQL 16 + Row-Level Security theo `workspace_id` + pgvector (HNSW) + unaccent/pg_trgm (tìm kiếm tiếng Việt) |
| ORM / migration | **Prisma**; RLS, partial index, expression index và `INCLUDE` viết bằng SQL thô trong migration; migration versioned, không sửa migration đã merge |
| Cache / Queue | Redis (native; Memurai trên Windows dev) + BullMQ; outbox pattern. Chưa dùng Kafka |
| Realtime | WebSocket (Socket.IO hoặc ws gateway của Nest) + SSE fallback |
| Storage | S3-compatible (MinIO local / AWS S3) |
| LLM / Agent | **LLM Router đa nhà cung cấp** (Claude / GPT / Gemini / DeepSeek), routing theo tác vụ/gói/chi phí, có fallback, streaming. **Agent runtime: Vercel AI SDK v7** (`ToolLoopAgent`, `toolApproval`) + **Agent Gateway** tự viết (tool từ Action Registry, credit meter, lưu/chạy tiếp run trong Postgres). Không Mastra, không fork, không swarm (D17 / Vision V3–V4) |
| Auth | Email OTP + mật khẩu (Zalo OTP khi có OA — OQ-02); JWT ngắn hạn + refresh; RBAC **Owner + Member** |
| Thanh toán | VietQR / Napas 247 (IPN), chuyển khoản thủ công có đối soát |
| Test | Vitest/Jest (unit), Testcontainers (integration), Playwright (e2e), RLS isolation test, k6 (load) |
| Observability | OpenTelemetry + Prometheus + Grafana + Loki |
| Infra / CI | **Không dùng Docker.** Postgres 16 + Redis native; Next.js + NestJS (api + worker) chạy bằng PM2/systemd; GitHub Actions |
| Font / UI | Token theo `styles.css` của prototype, map vào antd theme: Plus Jakarta Sans 300–800, JetBrains Mono; primary #2DC56A; icon `lucide-react` stroke 1.6. **Parity desktop với prototype < 5%** (Playwright screenshot) |

| Kênh | Zalo cá nhân (thư viện QR-login không chính thức, adapter cô lập — OQ-03), Web widget (JS SDK), Email (IMAP/SMTP, Gmail OAuth) |
| Search | Postgres FTS + unaccent + pg_trgm (chưa dùng OpenSearch) |
| Số liệu | Query trực tiếp Postgres có index (Tổng quan, thống kê agent/chiến dịch/ticket, Trợ lý AI). Không có module Báo cáo (D19) |
