# TIP-048g — Bình luận livestream Facebook / Instagram: phiên, cờ ý mua / SĐT (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-051d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051d.
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before051c.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 048g before049.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before049d.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048b before048g.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048e before048g.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/meta/webhook.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/comments/comment-reply.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/db/prisma/tenant/social.prisma`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before048g.
- **Parallel-safe with TIP-045 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/channels.jobs.module.ts`; integrate 048g before045.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048g before046.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 048g before048h.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`; integrate 048 before048g.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/FolderRail.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before048g.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/inbox/components/FolderRail.tsx`; integrate 001b before048g.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003c before048g.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 003e before048g.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003f before048g.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003g before048g.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before048g.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before048g.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before048g.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before048g.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/inbox/inbox.module.ts`; integrate 013c before048g.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/api/src/http/inbox/inbox.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before048g.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before048g.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before048g.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before048g.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `tools/parity/parity.manifest.ts`; integrate 015d before048g.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before048g.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before048g.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before048g.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before048g.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 020b before048g.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 020c before048g.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 020d before048g.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 020e before048g.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before048g.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/api/src/http/inbox/inbox.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/test/assistant-coverage.test.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before048g.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before048g.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before048g.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 023e before048g.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before048g.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before048g.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/api/src/http/inbox/inbox.http.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/orders/hooks/useOrderForm.ts`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before048g.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before048g.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048g.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before048g.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`, `tools/parity/parity.manifest.ts`; integrate 030b before048g.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 030c before048g.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 031b before048g.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before048g.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/orders/components/OrderFormModal.tsx`, `apps/web/src/features/orders/hooks/useOrderForm.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before048g.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before048g.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048g.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before048g.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `packages/actions/src/index.ts`, `packages/core/src/inbox/inbox.module.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before048g.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`, `apps/web/src/features/orders/hooks/useOrderForm.ts`; integrate 033d before048g.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before048g.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before048g.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before048g.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 036 before048g.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 037 before048g.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before048g.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 038b before048g.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before048g.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 040 before048g.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`; integrate 041 before048g.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before048g.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before048g.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/inbox.module.ts`; integrate 042c before048g.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate 043 before048g.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/orders/components/OrderFormModal.tsx`, `apps/web/src/features/orders/hooks/useOrderForm.ts`, `packages/actions/src/index.ts`, `packages/core/src/channels/jobs/channels.jobs.module.ts`, `packages/core/src/inbox/inbox.module.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before048g.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/test/assistant-coverage.test.ts`; integrate 047c before048g.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `packages/shared/src/i18n/server/en/inbox.ts`, `packages/shared/src/i18n/server/vi/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before048g.
- **TIP-ID:** TIP-048g · **Project:** AppChat V2 · **Module:** Kênh — livestream (Hộp thư) · **Priority:** P1 · **Estimated:** L (2 pha: P1 phiên + nhận + cờ; P2 giao diện)
- **Depends on:** 048f và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048h, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048f tạo `social.prisma` + `social_post`, hội thoại `comment`, `comment-inbound.ts`, action `comment.*` (agent dùng như nhân viên — DC-921). Bình luận live là bình luận của bài kind `live`.
  - Qua 048f gián tiếp: ingress `/hooks/channels/:type` + biên nhận (048b), adapter Meta + `meta/graph.ts` + `fake-transport.ts` (048e).
  - 048h đứng sau vì chung `channels.jobs.module.ts`, `inbox.module.ts`, `actions/src/index.ts`.
- **Files touched:** [exact M/C manifest](manifests/TIP-048g-files.md). Sửa có chủ đích `tenant/social.prisma` (chủ 048f) và `OrderFormModal.tsx` / `useOrderForm.ts` (form đơn — nhận điền sẵn). Màn mới `LiveSessionScreen.tsx` là orchestrator; component ở `components/live/`.
- **Quyết định nguồn:** D62 (#4) · DC-915 · DC-914 · **DC-921 (Q-911 / Q-912 chốt: AI agent là nhân viên)** · PD-905 · REQ-B14 · IP-3.6 (form điền sẵn).
- **Dòng COVERAGE nhận:** REQ-B14 · D62-live · PD-905 · DC-915 · DC-921

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. DB tenant riêng mỗi workspace: không `workspace_id`, không RLS.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Sau 048f:** bình luận → hội thoại `kind = 'comment'` khoá `c:<post>:<author>`; `social_post.kind` có `live`; `comment-inbound.ts` bỏ bài live (chờ 048g); action `comment.*`; `comment-reply.ts` (agent trả lời bình luận như tin direct).
  - **Worker kênh:** `channels.jobs.module.ts` (~184 dòng) mở worker gửi / thao tác theo lease hoặc `StatelessChannels` (~L151). Mẫu lease `lease.ts` (~53 dòng). Tin vào qua `inbound.processor.ts` concurrency 4 (~L60) — live cần hàng đợi riêng để không chậm tin thường.
  - **Đơn:** `OrderFormModal.tsx` (~235 dòng) mở bằng `ui.prefill` (~L42, ~L53), `useOrderForm.ts` `initialOrderDraft(prefill)`. Khách: `contact.create` có sẵn (form `CrmFormsHost.tsx` ở `app/(app)/_crm-forms/`). Kiểm ở Rà: prefill nhận được dòng sản phẩm chưa.
  - **Hộp thư FE:** `FolderRail.tsx` (~154 dòng) rail thư mục / kênh ~L138–148; `InboxScreen.tsx` (76).
  - **Prototype (bản 2026-11-10):** không màn livestream nào; chỉ mẫu agent "Livestream & Chốt đơn" L10911 và mẫu quy trình (màn ẩn) L12641. → mức 2, PD-905.
  - **Meta (khảo sát 2026-11-13):**
    - FB: webhook `live_videos` chỉ báo đổi trạng thái (`live`, `live_stopped`…), không mang bình luận.
    - FB SSE `GET streaming-graph.facebook.com/{live_video_id}/live_comments?access_token=…&comment_rate=ten_per_second&fields=from{name,id},message,created_time`. Vượt ngưỡng chỉ đẩy bình luận "chất lượng cao" → phải poll đối soát.
    - FB poll `GET /{live_video_id}/comments?live_filter=no_filter&order=reverse_chronological&since=<unix>`.
    - IG: webhook `live_comments` chỉ khi đang phát; nhắn riêng bình luận live IG chỉ khi đang phát. Nhắn riêng bình luận live FB: chưa kiểm (Rà bước 2).
    - Live TikTok / Shopee: không có API mở (Sắp có).
- **Key files to read first:** DC-915, D62 #4, PD-905 · TIP-048f §2, §4, §6 · `standards/channels/omnichannel-adapter.md` · `standards/domain/concurrency.md` · các file nêu trên.
- **Patterns to follow:**
  - Lease `lease.ts` (SET NX PX + gia hạn) cho một phiên một worker.
  - Hàng đợi riêng như `chop-<accountId>`; `with-job-context`.
  - Form điền sẵn `ui-commands.prefill` (REQ-F11, IP-3.6).
  - FE: route mỏng → màn orchestrator → component `components/live/` → hook `hooks/`.

## APPLICABLE STANDARDS
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — năng lực `live` ở manifest; core không `switch (type)`.
- [actions/action-registry](../standards/actions/action-registry.md) · [api/response-envelope](../standards/api/response-envelope.md) — action `live.*`, list keyset `{ data, next_cursor }`.
- [events/outbox](../standards/events/outbox.md) — sự kiện realtime chỉ id.
- [database/tenant-db](../standards/database/tenant-db.md) · [database/indexing](../standards/database/indexing.md) — index `=` trước, sort sau; EXPLAIN.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `inbox.reply` / `inbox.manage`, scope `inbox`.
- [domain/concurrency](../standards/domain/concurrency.md) — lease phiên, CAS `version`, bỏ trùng.
- [domain/validation-defaults](../standards/domain/validation-defaults.md) — SĐT VN, độ dài từ khoá.
- [domain/gap-filling](../standards/domain/gap-filling.md) — hành vi đã chốt DC-921 (agent là nhân viên); không nhắn hàng loạt (D06).
- [ui/frontend-structure](../standards/ui/frontend-structure.md) · [ui/prototype-parity](../standards/ui/prototype-parity.md) (§6b mức 2) · [ui/interaction-patterns](../standards/ui/interaction-patterns.md) · [i18n/i18n](../standards/i18n/i18n.md).
- [ops/observability-security](../standards/ops/observability-security.md) — không log SĐT / nội dung bình luận; metric độ trễ live.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` mới nhất sau khi 048f đã merge.
   - `python -X utf8 tools/obligations/manifests.py 048g`. Tích hợp trước các TIP chung file.
   - Kiểm lại mọi số dòng `~` ở CONTEXT. Lệch → sửa TIP, thêm dòng "Rà lại <ngày>".
2. Đọc lại tài liệu Meta bản mới nhất (`META_GRAPH_VERSION` của 048e): Live Video API, `live_comments` SSE, field webhook `live_videos` / IG `live_comments`, nhắn riêng bình luận live FB. Khác ghi chú → sửa `provider-capabilities.md` (048e) + ghi report.
3. Đổi mốc `20261115130000_live_sessions` nếu dev đã có migration mới hơn (phải sau mốc 048f). Ghi DV.
4. Kiểm `OrderFormModal.tsx` / `useOrderForm.ts` nhận prefill khách + dòng sản phẩm chưa. Chưa → thêm ở 048g (đã khai M), không đổi `order.create`.
5. Kiểm `contact.create` nhận `phone` + `source` + nguồn kênh; `contact_identity` gắn bằng cách nào (form khách từ hội thoại). Dùng đường có sẵn, không thêm action.

## TASK
Gom bình luận livestream Facebook / Instagram theo phiên, đánh dấu bình luận có ý mua / SĐT / câu hỏi; người (form điền sẵn) hoặc AI agent trực kênh (gọi thẳng) tạo khách và đơn, trả lời / nhắn riêng người bình luận.
- **Pha 1:** migration live; phiên mở / đóng từ webhook; FB SSE + poll đối soát, IG webhook; cờ ý mua / SĐT / câu hỏi; 4 action `live.*`; API đọc.
- **Pha 2:** mục "Livestream" ở rail Hộp thư, danh sách phiên, màn phiên (luồng bình luận + bảng cờ), tạo khách / đơn điền sẵn, cài đặt từ khoá; mock, i18n, parity mask PD-905, e2e.

## SPECIFICATIONS

### 1. Dữ liệu — migration `20261115130000_live_sessions` vào `social.prisma` (chủ 048f)
| Bảng | Cột chính | Ràng buộc / index |
|---|---|---|
| `live_session` | id, channel_account_id, post_id (→ `social_post` kind `live`), external_live_id, status (`live · ended`), started_at, ended_at null, comments_count int default 0, flagged_count int default 0, poll_cursor text null, last_polled_at null, version int, created_at, updated_at | unique(channel_account_id, external_live_id); idx(status, started_at DESC); FK post_id ON DELETE CASCADE |
| `live_comment_flag` | message_id (pk, → `message`), live_session_id, intent (`buy · phone · question`), phone_e164 null, product_hint null (≤ 200), contact_id null, order_id null, status (`new · handled · ignored`), handled_by null, handled_at null, version int, created_at | idx(live_session_id, status, created_at DESC); FK message / live_session ON DELETE CASCADE |

- Enum Postgres `live_session_status`, `live_flag_intent`, `live_flag_status`. Không FK sang contact / order (domain khác — handler kiểm).
- `version` trên `live_comment_flag` là bổ sung so với brief: CAS cho `live.flag_update` (hai người xử lý cùng cờ).
- Cài đặt live mỗi tài khoản ở `channel_account.settings.live` (jsonb có sẵn): `{ keywords: string[] (≤ 50 từ, mỗi từ ≤ 30 ký tự), ai_classify: boolean (mặc định false) }`. Không thêm cột.
- Ba lệnh DB (CLAUDE.md §7) — §9.

### 2. Phiên live (pha 1) — `live-session.service.ts`
1. **Mở phiên:**
   - FB: webhook `live_videos` `status = live` (`meta/webhook.ts` phân loại `HookItem.kind = 'live'`) → upsert `social_post` kind `live` + `live_session` `live`.
   - IG: bình luận `live_comments` đầu tiên của một media chưa có phiên → mở phiên.
   - Tài khoản tắt đồng bộ bình luận (048c) → không mở phiên (`ignored`).
2. **Đóng phiên:**
   - FB: `status = live_stopped` / `vod` → một lượt poll cuối, rồi `ended` + `ended_at`.
   - IG: không có bình luận live mới trong 30 phút → job nhịp đóng phiên.
   - Phiên `live` quá 12 giờ không tín hiệu → đóng (an toàn).
   - CAS `version`; sự kiện tới khi phiên đã `ended` → `ignored`.
3. **Bình luận live vào Hộp thư:** gọi `ingestComment` của 048f với `thread.post.kind = 'live'` → hội thoại `comment` theo (bài live, người bình luận). Trả lời / ẩn / xoá dùng `comment.*` của 048f.
4. **Nhắn riêng bình luận live** (`comment.private_reply` của 048f):
   - IG: chỉ khi phiên còn `live`. Phiên `ended` → `social_comment.private_reply_eligible = false` cho bình luận live IG; action trả 409 `live_session_ended`.
   - FB: theo kết quả Rà bước 2. Chưa kiểm được → tắt nhắn riêng cho bài live FB (hẹp hơn), ghi "Giả định đã chọn".
5. Đếm `comments_count`, `flagged_count` cộng nguyên tử (`UPDATE … SET n = n + 1`).

### 3. Lấy bình luận FB: SSE + poll đối soát — `facebook/live.ts` + `live-stream.processor.ts`
1. **Hàng đợi riêng `live-comments`** (worker ROLE=channels, concurrency mặc định 4). Không dùng `channel-inbound` → tin thường không chậm.
2. **Một phiên một lease:** `lease:live:<sessionId>` (SET NX PX 30 giây, gia hạn mỗi 10 giây, mẫu `lease.ts`). Không giữ lease → không mở SSE, không poll.
3. **SSE:** `fetch` stream tới `streaming-graph.facebook.com/{live_video_id}/live_comments` (`comment_rate=ten_per_second`, `fields=from{name,id},message,created_time`), đọc `ReadableStream`, tách dòng `data:`. Không thư viện SSE.
   - Rớt kết nối → nối lại backoff 1 / 2 / 4 / 8 / 30 giây; trong lúc rớt vẫn poll.
   - Token Page lấy như adapter 048e; không log token.
4. **Poll đối soát** mỗi 15 giây khi phiên `live`: `GET /{live_video_id}/comments?live_filter=no_filter&order=reverse_chronological&since=<poll_cursor − 30 giây>`, phân trang tới khi gặp bình luận cũ hơn mốc.
   - Ghi `poll_cursor` (`created_time` mới nhất đã thấy) + `last_polled_at`.
   - Lỗi rate (4 / 613) → giãn chu kỳ 30 → 60 giây. Lỗi 190 → `expired` theo 048e, dừng phiên.
5. **Không trùng:** mọi bình luận qua `ingestComment` → dedupe unique(channel_account_id, external_msg_id). SSE và poll trả cùng bình luận → một tin.
6. Ghi theo lô ≤ 50 bình luận / transaction. Độ trễ đích: SSE ≤ 3 giây, poll ≤ 20 giây. Metric `live_comments_lag_seconds`, `live_comments_total{source}` (không nhãn PII).
7. Nhịp quét (cùng tick của `StatelessChannels`): phiên `live` chưa có job → thêm job; phiên `ended` → dừng SSE, nhả lease.

### 4. IG live — `instagram/live.ts`
- Webhook `live_comments` (`HookItem.kind = 'live'`) → bình luận live như §2.3. Không SSE, không poll.
- Thiếu thông tin bài → `GET /{media-id}?fields=media_product_type,permalink,caption,timestamp` một lần.

### 5. Cờ ý mua / SĐT / câu hỏi — `intent-detect.ts` (hàm thuần) + `live-flags.ts`
1. **`detectIntent(text, keywords, catalogCodes)`** → `{ intent, phoneE164?, productHint? } | null`. Ưu tiên `phone` > `buy` > `question`.
   - **SĐT VN:** `0[35789]` + 8 số, hoặc `+84` / `84` + 9 số; cho phép dấu cách / chấm / gạch → E.164 `+84…`. Bỏ chuỗi giá (`100k`, `1tr`), dãy < 10 chữ số.
   - **Ý mua:** từ khoá mặc định ("chốt", "lấy", "mua", "đặt", "ib", "inbox", "còn không", "+1", "x2", "size …") + từ khoá cấu hình; so không dấu, không phân biệt hoa thường.
   - **Mã SP:** khớp `product.code` / `sku` (nạp theo lô, cache 5 phút theo workspace) → `productHint`.
   - **Câu hỏi:** dấu `?` hoặc "bao nhiêu", "giá", "ship", "còn size".
2. **Ghi cờ:** một bình luận một cờ (`message_id` pk, `ON CONFLICT DO NOTHING`). Khách đã có cờ `buy` / `phone` trạng thái `new` trong phiên → không thêm cờ trùng, chỉ cập nhật cờ đó (SĐT mới, mã SP mới).
3. **AI phân loại theo lô (tuỳ chọn, mặc định tắt):** bình luận không khớp luật gom 20 cái / 10 giây → một lượt LLM qua Agent Gateway, trừ credit (`CreditMeter`, idempotent theo `live:<sessionId>:<batchNo>`). Hết credit → tắt AI phân loại cho phiên, giữ luật. AI chỉ gắn cờ, không gửi gì.
4. Luật cờ / lượt phân loại chỉ gắn cờ, không gửi, không tạo đơn. Trả lời / chốt đơn là việc của nhân viên — người hoặc agent trực kênh (§5b).

### 5b. AI agent chốt đơn từ live (DC-921 — agent là nhân viên)
1. Bình luận live là bình luận thường của 048f → agent theo `ai_mode` của tài khoản: `auto` trả lời công khai ngay, gọi `comment.private_reply` khi cần (IG: khi phiên còn `live`).
2. Agent được cấp `contact.create` / `order.create` / `live.flag_update` (Builder): tạo khách / đơn thẳng trong lượt, đơn mang `conversation_id` = hội thoại bình luận (đường `linkConversation` có sẵn); sau đó `live.flag_update` `handled` + id. Không cần người bấm.
3. Lượt agent trên hội thoại bình luận live nhận thêm cờ đang `new` của chính khách trong phiên (intent, SĐT, mã SP) — 1–2 dòng gọi `liveContext()` của `live-flags.ts` từ `comment-reply.ts` (048f).
4. **Hàng đợi:** lượt agent đi `agent-reply` có sẵn (gom 3 giây theo hội thoại). Live đông → nhiều hội thoại → ghi metric `live_agent_turns_total`; không thêm hàng đợi riêng.
5. Mẫu agent "Livestream & Chốt đơn" (`tpl_27`, `catalog.ts` ~L48, prototype L10911): không đổi danh mục. Shop tự cấp Tools ở Builder như mọi agent.
6. Luật chung giữ nguyên: không action bulk cho cờ; không nhắn hàng loạt người bình luận / người xem (D06); ngưỡng báo giá / giảm giá COMMERCE.

### 6. Action — `packages/actions/src/live.ts` (module `inbox`)
| Action | Risk | Quyền | agentGrantable | Ghi chú |
|---|---|---|---|---|
| `live.list` | read | `inbox.view` + scope | read: true | Lọc `status`, `channel_account_id`; keyset `(started_at, id)` |
| `live.get` | read | `inbox.view` + scope | read: true | Phiên + đếm + số cờ theo trạng thái |
| `live.flag_update` | write | `inbox.reply` + scope | true | Input `{ message_id, status: handled · ignored · new, contact_id?, order_id?, if_version }`. CAS. Gắn `contact_id` / `order_id` sau khi người dùng tạo bằng form. Undo 24 giờ |
| `live.update_settings` | config | `inbox.manage` | false | Input `{ channel_account_id, keywords, ai_classify, if_version }` → `channel_account.settings.live` |

- Không action tạo khách / đơn mới: người dùng mở form `contact.create` / `order.create` có sẵn (điền sẵn), agent gọi thẳng hai action đó; tạo xong gọi `live.flag_update` gắn id (DC-921, Q-912).
- Không action bulk cho cờ (không "xử lý tất cả", không "nhắn tất cả").
- Action ghi có `preview()`. Nhãn `actions.live__*.title` vi + en. Ô `message_id` có đường tra (§7).

### 7. API đọc — `apps/api/src/http/inbox/live.controller.ts`
- `GET /v1/inbox/live-sessions?status=&cursor=&limit=` → `{ data, next_cursor }` (index `(status, started_at DESC)`).
- `GET /v1/inbox/live-sessions/:id` → phiên + đếm.
- `GET /v1/inbox/live-sessions/:id/comments?flagged=&status=&cursor=&limit=` → bình luận + cờ.
  - Có `flagged` → đi từ index `live_comment_flag (live_session_id, status, created_at DESC)`, deferred join `message`.
  - Không `flagged` → index `(post_id, last_message_at DESC)` của 048f + `message (conversation_id, created_at DESC)`.
- Scope `inbox` (own: hội thoại mình phụ trách). Ngoài scope → 404.
- Realtime: `message.received` có sẵn + `live.flagged` / `live.session_changed` (chỉ id) qua fanout có sẵn.

### 8. Giao diện (pha 2, PD-905 — mức 2)
- Prototype không vẽ → làm theo `interaction-patterns.md`, token + primitive có sẵn; ghi "Giả định đã chọn".
1. **Rail Hộp thư** (`FolderRail.tsx`): mục "Livestream" + số phiên đang phát; chỉ hiện khi có tài khoản `capabilities.live`. Bấm → `LiveSessionList.tsx` mở ngay dưới mục rail (phiên đang phát + 10 phiên gần nhất); chọn phiên → `/inbox/live/<id>`. Không sửa `InboxScreen.tsx`.
2. **Route** `apps/web/src/app/(app)/inbox/live/[id]/page.tsx` (≤ 120 dòng) → `LiveSessionScreen.tsx` (orchestrator ≤ 250 dòng).
3. **`LiveCommentFeed.tsx`:** luồng realtime (mới nhất dưới cùng, tự cuộn khi đang ở đáy, nút "N bình luận mới"), lọc "Chỉ có cờ", ảo hoá danh sách (500+ dòng — IP-5). Bình luận có cờ tô nền token trạng thái + nhãn intent.
4. **`LiveFlagPanel.tsx`:** tab Mới / Đã xử lý / Bỏ qua. Mỗi cờ: tên, SĐT, trích bình luận, mã SP.
   - "Tạo khách" → form `contact.create` điền sẵn tên + SĐT + nguồn kênh (IP-3.6). SĐT trùng khách có sẵn → hiện khách, nút "Gắn".
   - "Tạo đơn" → `OrderFormModal` điền sẵn khách + dòng SP theo `productHint` + ghi chú "Live <ngày> — <trích bình luận>". Người bấm Lưu.
   - Tạo xong → `live.flag_update` `handled` + id. "Bỏ qua" → `ignored` (có Hoàn tác).
   - Nút theo quyền (`<Can>`): thiếu `inbox.reply` → ẩn nút xử lý; thiếu quyền tạo khách / đơn → ẩn nút tương ứng.
5. **`LiveSettingsModal.tsx`** (`inbox.manage`): từ khoá chốt đơn (tag input), bật AI phân loại + cảnh báo trừ credit.
6. Trả lời / ẩn / nhắn riêng bình luận live dùng `CommentMenu` + `useCommentActions` của 048f (không viết lại).
7. Phiên đã kết thúc: luồng chỉ đọc; nhắn riêng IG khoá + tooltip "Phiên đã kết thúc".
8. Mobile 390: luồng bình luận và bảng cờ thành hai tab; vùng chạm ≥ 44px; không tràn ngang.
9. Trạng thái: chưa có phiên (lời mời phát live trên Page / IG đã kết nối), đang tải, lỗi + Thử lại, không quyền (IP-5).
10. Mock `shared/api/mock/domains/live.ts` (1 phiên đang phát, 1 đã kết thúc, 40 bình luận, 6 cờ), đăng ký ở `handlers.ts`. `PARITY_FIXTURE=1` → không thêm mục rail.
11. i18n vi + en: `inbox.json` `live.*`, `actions.json` `actions.live__*.title`, server `inbox.ts` (`live_session_ended`, nhãn intent). Parity: mask mục "Livestream" ở rail, `reason: 'PD-905 — không có trong prototype (mức 2)'`.

### 9. Lệnh DB (CLAUDE.md §7 — đủ ba lệnh, đúng thứ tự)
`pnpm --filter @appchat/db run db:generate` → `db:migrate-tenants` → `db:setup`. Kiểm `_appchat_migrations` của `appchat_tenant_template` có `20261115130000_live_sessions`.

### 10. Lỗi
| Mã | HTTP | Khi nào |
|---|---|---|
| `live_session_ended` (mới, server vi + en) | 409 | Nhắn riêng bình luận live IG sau khi phiên kết thúc |
| `CONFLICT` (có sẵn) | 409 | `if_version` cũ ở `live.flag_update` / `live.update_settings` |
| `comment_unsupported` (048b) | 409 | Nhắn riêng bình luận live FB khi năng lực chưa xác nhận |
| `VALIDATION_FAILED` (có sẵn) | 400 | Quá 50 từ khoá hoặc từ khoá > 30 ký tự |

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given webhook FB `live_videos` `live` rồi `live_stopped`, when xử lý (gửi lặp 2 lần), then một `live_session` `live` → `ended` (CAS), một `social_post` kind `live`, có lượt poll cuối trước khi đóng | `apps/api/test/integration/live-sessions.test.ts` + `packages/channels/test/meta-live.test.ts` |
| 2 | Given phiên `live`, SSE đẩy 30 bình luận rồi rớt, 12 bình luận tới trong lúc rớt, when poll `no_filter` chạy, then đủ 42 tin, không trùng (SSE + poll cùng id → một tin), `poll_cursor` tiến | `meta-live.test.ts` (fixture `live_comments_sse.txt` + `live_comments_poll.json`) + `live-sessions.test.ts` |
| 3 | Given hai worker ROLE=channels, when cùng nhận job phiên, then chỉ một giữ `lease:live:<sessionId>` và mở SSE; worker giữ lease chết → worker kia nhận sau ≤ 30 giây | `live-sessions.test.ts` (2 runner, Redis thật) |
| 4 | Given 2.000 bình luận live dồn vào `live-comments`, when đồng thời khách nhắn tin direct, then tin direct vào Hộp thư ≤ 3 giây (queue `channel-inbound` không xếp sau live) | `live-sessions.test.ts` (đo thời gian) |
| 5 | Given bình luận "0912 345 678 chốt áo M", "+1", "giá bao nhiêu?", "100k ship ko", "mã AO12" và từ khoá cấu hình "gom", when phát hiện, then đúng intent / SĐT `+84912345678` / mã SP; "100k" không thành SĐT; cùng khách hai lần → một cờ | `packages/core/test/live-intent.test.ts` (bảng ca) + `live-sessions.test.ts` |
| 6 | Given cờ `buy`, when người bấm "Tạo đơn", then form đơn điền sẵn khách + dòng SP; sau Lưu `live.flag_update` gắn `order_id`, cờ `handled`; hai người xử lý cùng cờ → một người 409 `CONFLICT`. Given tài khoản `ai_mode = auto`, agent được cấp `contact.create` / `order.create` / `live.flag_update`, when khách bình luận "0912 345 678 chốt áo M", then agent trả lời công khai, tạo khách + đơn (đơn có `conversation_id`), cờ `handled` + id — không cần người bấm | `LiveFlagPanel.test.tsx` + `live-sessions.test.ts` + `pnpm e2e inbox-live` |
| 7 | Given IG `live_comments` khi đang phát, when phiên kết thúc, then `comment.private_reply` bình luận live IG → 409 `live_session_ended`; trước đó gửi được (transport `fake`) | `live-sessions.test.ts` + fixture `ig_live_comments.json` |
| 8 | Given vai trò không có `inbox.reply`, when `live.flag_update`, then 403; không có `inbox.manage` → `live.update_settings` 403; scope own → chỉ thấy bình luận hội thoại mình phụ trách; không có action bulk / nhắn hàng loạt | `live-sessions.test.ts` + `packages/core/test/assistant-coverage.test.ts` |
| 9 | Given 50 phiên, 200k bình luận live, 20k cờ, when danh sách phiên, luồng cờ `new` LIMIT 50, luồng bình luận một phiên LIMIT 50, then Index Scan đúng index §1 / 048f, không Seq Scan | EXPLAIN (ANALYZE, BUFFERS) dán report |
| 10 | Given UI mock, when mở rail Livestream → phiên → lọc có cờ → Tạo khách → Bỏ qua → Hoàn tác, then đủ trạng thái rỗng / tải / lỗi; parity Hộp thư < 5% với mask PD-905; mobile 390 hai tab, không tràn ngang | `pnpm e2e inbox-live` + `pnpm parity inbox` |
| 11 | Given API thật (`META_TRANSPORT=fake`), when e2e http chạy AC1–AC2; live thật trên Page / IG của shop | `pnpm e2e:http inbox-livestream` — live thật: chưa nghiệm thu với provider thật (Q-908 App Review) |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{channels,shared,actions,db,core,api,web}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check` · `pnpm lint:masks`.
- DB: ba lệnh §9, rồi `psql … -d appchat_tenant_template -c "SELECT name FROM _appchat_migrations ORDER BY name DESC LIMIT 3;"`.
- Unit: `pnpm --filter @appchat/channels test -- test/meta-live.test.ts` · `pnpm --filter @appchat/core test -- test/live-intent.test.ts test/assistant-coverage.test.ts`.
- Integration (`--workers=1`, `TENANT_CLIENT_CACHE=10`, kiểm slot Postgres trước): `pnpm --filter @appchat/api test:integration -- test/integration/live-sessions.test.ts`.
- FE: `pnpm parity inbox` · `pnpm e2e inbox-live` · `pnpm e2e:http inbox-livestream`.
- EXPLAIN như AC9.
- Live thật: chưa có App Review (Q-908) → ghi "chưa nghiệm thu với provider thật".

## CONSTRAINTS
- **DO NOT:**
  - Luật cờ / lượt phân loại tự tạo khách / đơn hay tự gửi (chỉ nhân viên — người hoặc agent trực kênh — làm, §5b).
  - Thêm luật / chặn riêng cho agent trên bình luận live (DC-921).
  - Nhắn riêng hàng loạt người bình luận / người xem live; action bulk cho cờ.
  - Thêm permission mới (Q-912).
  - Xử lý live trên hàng đợi `channel-inbound`; mở SSE khi không giữ lease.
  - Thêm thư viện SSE / EventSource (đọc stream bằng `fetch`).
  - Bật AI phân loại mặc định; lượt phân loại gửi bất cứ gì ra ngoài.
  - `switch (type)` ở core / UI — đọc `capabilities.live`.
  - Thêm `workspace_id` / RLS; FK sang contact / order.
  - Log SĐT / nội dung bình luận / token.
- **REUSE:**
  - `ingestComment`, hội thoại `comment`, `comment.*`, `CommentMenu`, `useCommentActions`, `comment-reply.ts` (048f).
  - `meta/graph.ts`, `meta/webhook.ts`, `fake-transport.ts` (048e); ingress + biên nhận (048b).
  - `lease.ts`, `with-job-context`, `CreditMeter`, fanout realtime.
  - `contact.create` / `order.create` + `OrderFormModal` / form khách có sẵn (điền sẵn, IP-3.6).
- **SKIP:**
  - Live TikTok / Shopee (không có API — Sắp có, REQ-B08b).
  - Phát live, ghim bình luận, chặn người xem.
  - Thống kê / báo cáo phiên live (D19).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` khi Chủ thầu ghép dải 048.
- [x] Bảng / action / path khớp DC-915 + brief §3.3; thêm `live_comment_flag.version` có lý do (CAS).
- [x] Agent là nhân viên (DC-921): trả lời / tạo khách + đơn như người; luật cờ không tự tạo; không nhắn hàng loạt; không permission mới (Q-912).
- [x] Lease một phiên, hàng đợi riêng, SSE + poll không trùng; index theo indexing.md; EXPLAIN.
- [x] 11 AC có Given / When / Then + bằng chứng; ô cần live thật ghi trung thực.
- **Gap đã khai:**
  - App Review Meta (Q-908) chưa có → chỉ test transport `fake` + fixtures.
  - Nhắn riêng bình luận live FB chưa kiểm tài liệu → tắt tới khi Rà bước 2 xác nhận.
  - Phiên IG đóng theo 30 phút không bình luận (IG không có webhook kết thúc live).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; BE 200–400 dòng (trần 600), FE 150–250 (trần 400); `LiveSessionScreen.tsx` ≤ 250, `page.tsx` ≤ 120.
- [ ] AC 1–11 có kết quả từng cái, dán output thật (`pnpm …`, EXPLAIN); ô cần live thật ghi "chưa nghiệm thu với provider thật".
- [ ] **Action-first (BUILDER-HANDOFF):** mọi ghi qua `ActionExecutor`; FE chỉ `useAction(id).run(input)`; tạo khách / đơn qua action có sẵn (form của người, tool của agent).
- [ ] **Agent là nhân viên (DC-921, D51):** agent `auto` trả lời + tạo khách / đơn thẳng bằng Tools ở Builder; luật cờ / phân loại không gửi, không tạo; gửi hàng loạt vẫn duyệt (D06).
- [ ] **Tenant DB:** không `workspace_id`; chạy CẢ `db:generate` → `db:migrate-tenants` → `db:setup`; template có `20261115130000_live_sessions`.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
