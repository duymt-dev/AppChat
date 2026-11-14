# TIP-048c — Giao diện kết nối kênh theo registry: OAuth 3 bước, chọn tài khoản, "Sắp có", Đồng bộ theo năng lực, một nguồn danh sách kênh (Kênh, D62)

## HEADER
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before049d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before048c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ChannelCard.tsx`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `tools/parity/parity.manifest.ts`; integrate 014c before048c.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before048c.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048c before046.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/FolderRail.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 048c before048h.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/inbox/components/FolderRail.tsx`, `apps/web/src/features/settings/components/ChannelsSection.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 001b before048c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before048c.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before048c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before048c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before048c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before048c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before048c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015b before048c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before048c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 015d before048c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015e before048c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before048c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before048c.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before048c.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before048c.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before048c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before048c.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`; integrate 020c before048c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 020d before048c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`; integrate 020e before048c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/agents/components/builder/RoutingSection.tsx`, `apps/web/src/features/agents/hooks/useAgentBuilder.ts`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before048c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 023b before048c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/e2e/inbox.spec.ts`, `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before048c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before048c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before048c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before048c.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/components/ConversationList.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before048c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before048c.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before048c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before048c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 030b before048c.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before048c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 032b before048c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032c before048c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before048c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvRow.tsx`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 032e before048c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before048c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/types.ts`, `apps/web/src/shared/api/mock/domains/inbox.ts`, `tools/parity/parity.manifest.ts`; integrate 033c before048c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/tickets/types.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before048c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/src/features/tickets/types.ts`, `tools/parity/parity.manifest.ts`; integrate 034c before048c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/src/features/tickets/types.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before048c.
- **Parallel-safe with TIP-035c (coverage-closure manifest):** sequential, shares `apps/web/e2e/settings.spec.ts`; integrate 035c before048c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `tools/parity/parity.manifest.ts`; integrate 037 before048c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038 before048c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before048c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before048c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before048c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before048c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 042 before048c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 043 before048c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/tickets/types.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before048c.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before048c.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/agents/components/builder/RoutingSection.tsx`, `apps/web/src/features/inbox/components/ConnectChannelModal.tsx`, `apps/web/src/shared/api/mock/handlers.ts`, `fixtures/prototype-parity/settings.json`, `tools/parity/parity.manifest.ts`; integrate 047d before048c.
- **TIP-ID:** TIP-048c · **Project:** AppChat V2 · **Module:** Kênh — frontend kết nối + danh sách kênh (web) · **Priority:** P0 · **Estimated:** L
- **Depends on:** 048b, 014c, 042b và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 048d, 048e, 048f, 048g, 048h, 049d, 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 048b cung cấp DTO danh mục kênh (`connect_kind`, `oauth`, `via`, `sync`, `window`), `grant` của tài khoản, action `channel.oauth_select` / `channel.reauthorize`, mã lỗi `channel_in_use_elsewhere`.
  - 048 (qua 048b) cung cấp `apps/web/src/shared/oauth/useOAuthConnect.ts` + mock `oauth.*`. 048c dùng lại, không viết lại.
  - 014c sửa `ConnectChannelModal.tsx` / `ManageChannelDrawer.tsx` / `ChannelCard.tsx` (cảnh báo rủi ro Zalo, SLA, UI chỉ đọc manifest). Ghép sau để không viết đè.
  - 042b sửa `ManageChannelDrawer.tsx`, `channel-types.ts`, mock `settings-apps.ts` (chia lead theo tài khoản).
- **Files touched:** [exact M/C manifest](manifests/TIP-048c-files.md). Component mới ở `features/settings/components/`; hook dùng chung `apps/web/src/shared/channels/useChannelCatalog.ts`. Sửa có chủ đích file Hộp thư / Agents / ticket / form dùng chung để đọc một nguồn danh sách kênh.
- **Quyết định nguồn:** D62 (#1, #2) · DC-911 · DC-909 (`useOAuthConnect`) · PD-903 · PD-906 · Q-912 (không thêm permission) · prototype-parity §6 (Kênh, AI Agents D29) · D42 / D43.
- **Dòng COVERAGE nhận:** REQ-B15 · REQ-B16 (UI kết nối bằng đăng nhập nền tảng) · REQ-B17 · D62-soon · PD-903 · PD-906 · DC-911.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Next.js App Router + Ant Design v6, token `packages/ui/theme.ts`, i18n `apps/web/messages/{vi,en}/*.json`. Ghi chỉ qua `useAction(id).run(input)`.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Modal kết nối Cài đặt** `features/settings/components/ConnectChannelModal.tsx` (246): `PICKABLE` cứng ~L26; rẽ theo type ~L184–187 (Zalo → `ZaloQrStep` 57, Email → `EmailConnectStep` 82). Không render theo `connect.kind`.
  - **Drawer** `ManageChannelDrawer.tsx` **375 / 400 dòng**. Khối Đồng bộ giống nhau mọi kênh. Không có hạn uỷ quyền.
  - **Cài đặt → Kênh:** `ChannelsSection.tsx` (142), `ChannelCard.tsx` (53), `ChannelRateFields.tsx` (69), `channel-types.ts` (71), `settings/api.ts` (179). Mock `shared/api/mock/domains/settings-apps.ts` (291) đọc `fixtures/prototype-parity/settings.json` (`channels[]`, `available`).
  - **Hộp thư:** `inbox/components/ConnectChannelModal.tsx` (99) → `?connect=<type>` ~L65 (không ai đọc) · `FolderRail.tsx` (154) mục KÊNH ~L138–148 · `ConversationList.tsx` (108) chip ~L57–78 · `ConvRow.tsx` (103) badge ~L49–60 · `inbox/types.ts` `ChannelType` 3 kênh ~L8. Catalog đọc từ `GET /inbox/connect-channels` (`inbox/api.ts`; mock `domains/inbox.ts` ~L135 `fixture.connect_channels`).
  - **Form dùng chung:** `shared/forms/ChannelSelect.tsx` ~L8 · `features/tickets/types.ts` ~L7.
  - **Agents builder:** `useAgentBuilder.ts` ~L28 · `RoutingSection.tsx` ~L29–45 · `TestPanel.tsx` ~L14.
  - **Icon:** `packages/ui/src/icons/paths.ts` (74) chỉ có `lg-facebook` ~L31.
  - **i18n:** `settings.json` (2164) `channels.desc` ~L480–497 có sẵn 5 kênh; wizard ~L521; drawer ~L572. `inbox.json` (599) connect ~L483–504.
  - **E2E khoá hành vi cũ:** `e2e/settings.spec.ts` ~L105 (số type) · `e2e/inbox.spec.ts` ~L74 · `e2e/agents.spec.ts` ~L30 (cấm chữ "Facebook").
  - **Gần trần:** `ManageChannelDrawer.tsx` 375, `settings/types.ts` 384, `inbox/styles/modal.styles.ts` 399, mock `inbox.ts` 382 → thêm file mới, không nhồi.
  - **Prototype (bản 2026-11-10):**
    - Danh sách kênh lệch nhau 4 nơi: `state.channels` ~L8658–8676 (17), `chanMeta` ~L8971–8989, `chanMarketGroups` ~L8990–9008, `connectChannels` ~L13085–13099 (13). Seed tài khoản ~L9761–9776.
    - Cài đặt → Kênh kết nối ~L6716–6770. Picker Hộp thư ~L1852–1888. Rail KÊNH ~L1907–1936 (~L1927–1929). Dropdown tài khoản ~L13083. Chip agent ~L12860.
    - Modal kết nối ~L777–868 (logic ~L12428–12469): 3 bước; `chanKind` ~L9787 (QR / form / OAuth); OAuth ~L813–830 "Đăng nhập với X", quyền ~L819, chọn trang mẫu FB ~L12452; bước 3 ~L845–857.
    - Drawer quản lý ~L870–965 (logic ~L12470–12514): token "54 ngày"; Đồng bộ ~L12485–12491 (Tin nhắn / Bình luận / Đánh giá / Tự tạo liên hệ) giống nhau mọi kênh; lịch sử 0 / 7 / 30 / 90 ~L943.
- **Key files to read first:** DC-911, PD-903, PD-906, D62 · TIP-048b §1, §6, §9 (DTO + action) · TIP-048 (`useOAuthConnect`) · Blueprint §7.2 (settings registry) · prototype vùng nêu trên · file nêu trên.
- **Patterns to follow:**
  - Bước kết nối theo `ZaloQrStep.tsx` / `EmailConnectStep.tsx` (một file một bước).
  - Đọc bằng TanStack Query, ghi bằng `useAction`; lỗi theo `error.code` (`errors.*`).
  - Mock domain + handler theo `domains/settings-apps.ts` + `handlers.ts`.
  - Mask parity có mã theo `tools/parity/parity.manifest.ts` (`reason` chứa `PD-xxx`).

## APPLICABLE STANDARDS
- [ui/frontend-structure](../standards/ui/frontend-structure.md) — mỗi modal / bước / khối một file; hook ở `hooks/` hoặc `shared/`; không import chéo `features/x/components/*`.
- [ui/prototype-parity](../standards/ui/prototype-parity.md) — < 5% ở 1440×900; §6 (Kênh chỉ theo manifest, AI Agents D29); §6b mức lệch; mask phải có mã.
- [ui/interaction-patterns](../standards/ui/interaction-patterns.md) — tải / rỗng / lỗi / không quyền; popup bị chặn; mobile 390.
- [channels/omnichannel-adapter](../standards/channels/omnichannel-adapter.md) — quy tắc 2 (UI chỉ đọc manifest), 7 (modal dựng theo `connect.kind`).
- [i18n/i18n](../standards/i18n/i18n.md) — vi nguồn + en, key không có ".".
- [actions/action-registry](../standards/actions/action-registry.md) · [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `useAction`, `useCan('channels.manage')`.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 048b đã merge. Chạy `python -X utf8 tools/obligations/manifests.py 048c`; tích hợp trước các TIP chờ chung file (dòng khai ở HEADER).
2. Kiểm lại mọi số dòng `~` trên `origin/dev`. Lệch → sửa TIP dòng "Rà lại <ngày>".
3. Đọc API thật của `useOAuthConnect` (048): tham số, trả `{ accounts, grantId, error }`, cách xử lý popup bị chặn, đọc `?oauth=` / `?oauth_error=`. Tên khác brief → theo code 048, ghi report.
4. Đọc DTO thật của 048b: `channelCatalogItemSchema`, `grant` của tài khoản, input / output `channel.oauth_select`. Lệch TIP này → theo code 048b.
5. Chạy `node tools/scripts/normalize-prototype.mjs` (D44, chỉ khi có bản prototype mới hơn). Mở prototype vào modal kết nối (3 bước, kênh OAuth), drawer quản lý, Cài đặt → Kênh, picker Hộp thư, builder Agents; chụp làm mốc.
6. Đếm `ManageChannelDrawer.tsx` sau 014c / 042b. Sau 048c phải nhỏ hơn trước (khối Đồng bộ ra file riêng), ≤ 400.
7. Kiểm `pnpm lint:masks` chấp nhận mã PD-903 / PD-906 ở trạng thái `đề xuất` mức 1.
8. Kiểm các màn đang đo parity có danh sách kênh (`settings:channels`, `settings:channel-connect`, `settings:channel-manage`, `inbox:default`, `agents:builder`): đo trước khi sửa, ghi `diffRatio` làm mốc.

## TASK
Dựng giao diện kết nối kênh theo registry, chỉ qua DTO / action của 048b và hook của 048:
- Một nguồn danh sách kênh `useChannelCatalog` cho Cài đặt, modal kết nối, Hộp thư (chip, rail, badge, dropdown), Agents builder, form ticket / lịch hẹn.
- Modal kết nối rẽ theo `connect_kind` (không `switch(type)`); OAuth 3 bước; thẻ `via` (Messenger → Facebook Page); "Sắp có" cho WhatsApp / WhatsApp Business API / Telegram / LINE / Viber / WeChat.
- Drawer quản lý: khối Đồng bộ theo `capabilities.sync` (`ChannelSyncSection.tsx`), hạn uỷ quyền thật + Uỷ quyền lại (`ChannelGrantInfo.tsx`).
- Icon thương hiệu, i18n vi + en, mock, mask parity PD-903 / PD-906, e2e mới + sửa ca đang khoá.

Không bật kênh thật (048d / 048e / 048h bật adapter; UI tự hiện khi manifest đổi `status`).

## SPECIFICATIONS

### 1. Một nguồn danh sách kênh (`apps/web/src/shared/channels/useChannelCatalog.ts`)
1. Đọc `GET /inbox/connect-channels` (DTO `channelCatalogItemSchema` của 048b) bằng TanStack Query. Query key `['channels', 'catalog']`, `staleTime` 10 phút. Không có hàm ghi.
2. Trả:
   - `catalog` — đủ type theo thứ tự registry.
   - `byType(type)` — kênh lạ (type cũ không còn trong registry) → mục giả nhãn "Kênh khác", icon chung. Không vỡ.
   - `connectable` — `status ≠ coming_soon`, không có `via`.
   - `cards` — thẻ hiện ở modal: `connectable` + thẻ `via` + `coming_soon`.
   - `soon` — `status = coming_soon`.
   - `label(type)` (khoá i18n từ `label_key`), `icon(type)` (khoá `packages/ui/icons`).
3. Lọc theo nghiệp vụ ở nơi dùng, không ở hook:
   - Hộp thư (chip, rail, badge, dropdown tài khoản): type có ít nhất một tài khoản trong workspace (đọc `/inbox/accounts` có sẵn) + `byType` cho badge.
   - Agents builder: `connectable` (kênh có thể gắn agent); `soon` hiện khoá "Sắp có".
   - Form ticket / lịch hẹn (`ChannelSelect.tsx`): `catalog` ∩ `TICKET_CHANNELS` / `APPOINTMENT_SOURCES` (shared, 048b).
4. Cấm `switch(type)` / mảng type cứng ở component. Kiểm bằng grep ở AC10.

### 2. Modal kết nối (`features/settings/components/ConnectChannelModal.tsx`)
1. **Bước 1 — chọn kênh:**
   - Lưới thẻ từ `cards`, nhóm theo `group` (thứ tự prototype ~L8990–9008).
   - Thẻ `coming_soon`: nhãn "Sắp có", mờ, không bấm được, tooltip "Kênh này sắp ra mắt".
   - Thẻ `beta`: badge "Beta" (TikTok, 048h).
   - Thẻ có `via` (Messenger): bấm → chuyển sang type đích (`facebook`), bước 2 của Facebook Page. Phụ đề thẻ "Kết nối qua Facebook Page".
   - Bỏ `PICKABLE` cứng ~L26.
2. **Bước 2 — rẽ theo `connect_kind`** (bảng tra component, không theo type):

   | `connect_kind` | Bước 2 |
   |---|---|
   | `qr` | `ZaloQrStep` có sẵn |
   | `credentials` | `EmailConnectStep` có sẵn (form theo `connect.fields`) |
   | `embed` | bước widget có sẵn |
   | `oauth` | `OAuthConnectStep` mới |

   Bỏ rẽ theo type ~L184–187. Type mới của 048d / 048e / 048h không cần sửa modal.
3. **Mở theo URL:** `?connect=<type>` (từ picker Hộp thư ~L65 hoặc thông báo) → mở modal ở bước 2 của type đó; type `coming_soon` → bước 1. `?oauth=` / `?oauth_error=` (callback 048) → mở lại modal ở bước 2 OAuth của type đã chọn trước khi rời trang (lưu type ở `sessionStorage`, bọc try / catch).
4. Chỉ người có `channels.manage` thấy nút "Kết nối kênh" (`useCan`). Không thêm permission (Q-912).

### 3. OAuth 3 bước (`OAuthConnectStep.tsx` + `OAuthQuickSetup.tsx`)
1. **Bước 2a — đăng nhập nền tảng:**
   - Tiêu đề "Đăng nhập với <nền tảng>" + danh sách quyền sẽ xin (từ `oauth.scopes` → nhãn i18n `settings.channels.oauth.scope_*`; scope lạ hiện nguyên văn) như prototype ~L813–830.
   - Nút "Đăng nhập với <nền tảng>" → `useOAuthConnect` (048) với `provider = oauth.provider`, `purpose = 'channel'`, `return_to = '/settings/channels'`.
   - Popup bị chặn → hook chuyển trang (048). Đang chờ → nút loading + "Đang chờ <nền tảng> xác nhận…" + nút Huỷ (`oauth.cancel`).
   - `oauth_error`: `oauth_denied` → "Bạn đã từ chối cấp quyền"; `oauth_state_invalid` → "Phiên kết nối đã hết hạn, thử lại"; còn lại → `errors.<code>`. Nút "Thử lại".
2. **Bước 2b — chọn Page / OA / tài khoản** (`oauth.picker = true`):
   - Danh sách `accounts` (avatar, tên, `external_id` rút gọn), checkbox chọn nhiều, mặc định chọn hết tài khoản chưa có ở workspace.
   - Tài khoản đã có ở workspace này → nhãn "Đã kết nối — sẽ nối lại".
   - Rỗng → trạng thái rỗng "Không tìm thấy Page / OA nào bạn quản lý" + link hướng dẫn quyền (i18n).
   - `picker = false` → bỏ qua bước chọn, chọn tài khoản duy nhất.
3. **Bước 3 — cấu hình nhanh** (`OAuthQuickSetup.tsx`, theo prototype ~L845–857):
   - Tên hiển thị (chỉ khi chọn 1 tài khoản), agent trực, chế độ AI, phân công — dùng ô / tuỳ chọn có sẵn của bước 3 Zalo / Email.
   - Không có tuỳ chọn đồng bộ ở bước 3 (prototype không vẽ; Đồng bộ ở drawer).
   - Nút "Hoàn tất" → `useAction('channel.oauth_select').run({ pending_id, external_ids, quick })` kèm `Idempotency-Key`.
4. **Kết quả:**
   - Thành công → toast "Đã kết nối n tài khoản", đóng modal, invalidate `['settings','channels']` + `['channels','catalog']` + `/inbox/accounts`.
   - `channel_in_use_elsewhere` → dòng tài khoản đó báo inline "Page / OA này đang gắn với workspace khác", các dòng khác giữ chọn.
   - Lỗi hạn mức kênh → thông báo + nút "Mua thêm kênh" mở đường mua addon có sẵn (ví / gói).

### 4. Drawer quản lý kênh
1. **`ChannelSyncSection.tsx`** (tách khỏi `ManageChannelDrawer.tsx`, PD-906):
   - Mục hiện theo `sync` của kênh: `messages` → "Tin nhắn"; `comments` → "Bình luận"; `auto_contact` → "Tự tạo liên hệ"; `history` → "Đồng bộ lịch sử" 0 / 7 / 30 / 90 ngày (prototype ~L943).
   - "Đánh giá" không bao giờ hiện. Kênh `sync` rỗng → ẩn cả khối.
   - Ghi qua action có sẵn (`sync_messages`, `sync_auto_create_contact`, `history_days` ở `settings-apps.ts`). Mục `comments` dùng khoá settings 048f thêm — 048c hiện công tắc khoá "Sắp có" tới khi 048f có action.
2. **`ChannelGrantInfo.tsx`** (khối Kết nối, PD-906):
   - Kênh có `oauth`: hạn uỷ quyền thật từ `account.grant` (`access_expires_at` / `refresh_expires_at`; Page token Meta không hạn → "Không hết hạn").
   - Còn ≤ 7 ngày → cảnh báo. `grant.status ≠ active` hoặc tài khoản `expired` → "Hết hạn uỷ quyền" + nút "Uỷ quyền lại".
   - "Uỷ quyền lại" → `useAction('channel.reauthorize').run({ channel_account_id, return_to })` → mở `authorize_url` theo đường `useOAuthConnect` → quay về drawer.
   - Kênh không `oauth` → không hiện khối. Bỏ chữ "54 ngày" cứng.
3. `ManageChannelDrawer.tsx` chỉ ghép hai component mới; số dòng giảm so với trước (Rà #6).
4. `ChannelCard.tsx`: trạng thái `expired` → badge "Hết hạn uỷ quyền" (token cảnh báo), bấm mở drawer.

### 5. Hộp thư, Agents, form
1. **Hộp thư:**
   - `ConnectChannelModal.tsx` (Hộp thư): lưới từ `cards`; bấm thẻ → `/settings/channels?connect=<type>` (thẻ `via` dùng type đích).
   - `FolderRail.tsx` mục KÊNH ~L138–148, `ConversationList.tsx` chip ~L57–78, `ConvRow.tsx` badge ~L49–60: nhãn / icon / màu từ catalog.
   - `inbox/types.ts` `ChannelType` thành `string` (catalog). Chỗ cần biết năng lực kênh đọc `/inbox/channels` (có sẵn), không so type.
2. **Agents builder:** `useAgentBuilder.ts` ~L28, `RoutingSection.tsx` ~L29–45, `TestPanel.tsx` ~L14 đọc catalog. Kênh `coming_soon` hiện chip khoá "Sắp có" (prototype-parity §6 AI Agents: danh sách kênh theo registry).
3. **Form ticket / lịch hẹn:** `ChannelSelect.tsx` ~L8, `features/tickets/types.ts` ~L7 dùng `TICKET_CHANNELS` / `APPOINTMENT_SOURCES` của shared ∩ catalog.

### 6. Icon, token, i18n
1. `packages/ui/src/icons/paths.ts` thêm path thương hiệu: `lg-messenger`, `lg-instagram`, `lg-tiktok`, `lg-shopee`, `lg-whatsapp`, `lg-telegram`, `lg-line`, `lg-viber`, `lg-wechat`, `lg-zalo` (`lg-facebook` có sẵn ~L31). Lấy path từ sprite prototype (`brandKey` ~L8910–8970); icon prototype không có → path SVG đơn sắc tối giản (ghi report). Không thêm thư viện icon.
2. Màu thương hiệu nằm trong path logo ở `paths.ts` (cùng cách `lg-facebook` ~L31 đang làm), giữ đúng giá trị prototype. Component (chip, badge, thẻ) chỉ dùng icon + token có sẵn, không hard-code màu / px. Cần token mới → escalation L2 (file token không có trong manifest; `tokens.ts` 399 dòng).
3. i18n `settings.json` / `inbox.json` vi + en: nhãn kênh mới (`channels.desc` ~L480–497 có sẵn 5 kênh — dùng lại), bước OAuth, quyền, cấu hình nhanh, Đồng bộ, uỷ quyền, "Sắp có", "Kết nối qua Facebook Page", lỗi. Key không chứa ".".

### 7. Mock (`shared/api/mock/*`)
1. Catalog mock `MOCK_CHANNEL_CATALOG` đặt ở `domains/channel-oauth.ts` (mới), đủ type registry: 3 kênh GA, `zalo_oa` / `facebook` / `instagram` / `tiktok_messaging` dạng `coming_soon` (đổi khi 048d / 048e / 048h bật), `messenger` (`via: 'facebook'`), 6 kênh "Sắp có" của PD-903. `domains/inbox.ts` (382 dòng) chỉ đổi một dòng ~L135: `/inbox/connect-channels` trả `MOCK_CHANNEL_CATALOG`.
2. `domains/settings-apps.ts`: nhóm kênh thêm trường danh mục; tài khoản thêm `external_id` + `grant`. Nhóm có `coming_soon` không thêm tài khoản (giữ luật cũ ~L80).
3. `domains/channel-oauth.ts` (mới): `channel.oauth_select` (tạo tài khoản, `external_id` `p_dup` → 409 `channel_in_use_elsewhere`, vượt 5 kênh → lỗi hạn mức), `channel.reauthorize` (trả `authorize_url` mock của 048). Đăng ký ở `handlers.ts`.
4. Mock bật kênh OAuth giả cho e2e: cờ mock (`?mockOAuthChannels=1` hoặc state test) chuyển `facebook` thành `beta`. Không đổi dữ liệu parity khi cờ tắt.
5. `fixtures/prototype-parity/settings.json`: kênh theo registry + trường danh mục; giữ dữ liệu mẫu prototype cho kênh hiện có.
6. `inbox-shape.test.ts`: shape catalog mới parse đúng.

### 8. Parity
1. `tools/parity/parity.manifest.ts` thêm mask, `reason` mở đầu bằng mã:
   - `PD-903`: lưới thẻ kênh ở `settings:channel-connect`; danh sách kênh ở `settings:channels`; mục KÊNH rail + chip + dropdown tài khoản ở `inbox:default`; chip kênh ở `agents:builder`.
   - `PD-906`: khối Đồng bộ + dòng hạn token ở `settings:channel-manage`.
2. Tổng diện tích mask mỗi ID ≤ 15% (prototype-parity §6b). Vùng ngoài mask < 5%.
3. Màn đo đang có (`pnpm parity <id>` từng ID ở Rà #8) + `pnpm parity --done` (sửa `packages/ui/icons`, lớp dùng chung).

### 9. E2E
1. `e2e/channels-oauth.spec.ts` (mock, cờ OAuth giả):
   - Modal → thẻ Facebook Page → Đăng nhập (mock popup) → chọn 2 Page → cấu hình nhanh → Hoàn tất → 2 thẻ tài khoản mới.
   - Thẻ Messenger → vào bước 2 của Facebook Page.
   - Thẻ WhatsApp / Telegram / LINE / Viber / WeChat / WhatsApp Business API → "Sắp có", không bấm được.
   - Page `p_dup` → dòng báo "đang gắn với workspace khác".
   - Drawer tài khoản hết hạn → "Uỷ quyền lại" gọi `channel.reauthorize`.
   - Mobile 390: modal toàn màn, không tràn ngang, vùng chạm ≥ 44px.
2. Sửa ca khoá cũ: `settings.spec.ts` ~L105 (số type → đọc catalog mock), `inbox.spec.ts` ~L74 (picker theo catalog), `agents.spec.ts` ~L30 (bỏ ca cấm chữ "Facebook"; thay bằng ca chip Facebook khoá "Sắp có" khi `coming_soon`).

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given catalog mock có 3 kênh GA, 4 kênh D62 `coming_soon`, `messenger` (`via`), 6 kênh PD-903, when mở modal kết nối, then thẻ đúng thứ tự nhóm; 6 kênh PD-903 + 4 kênh D62 hiện "Sắp có", không bấm được; không còn `PICKABLE` cứng | `useChannelCatalog.test.ts` + e2e `channels-oauth.spec.ts` |
| 2 | Given kênh `connect_kind = 'oauth'` (cờ mock), when bấm thẻ, then bước 2 là `OAuthConnectStep`; kênh `qr` / `credentials` vẫn ra `ZaloQrStep` / `EmailConnectStep`; thêm type OAuth mới vào mock không cần sửa modal | e2e + `OAuthConnectStep.test.tsx` |
| 3 | Given luồng OAuth mock, when đăng nhập → chọn 2 Page → cấu hình nhanh → Hoàn tất, then `channel.oauth_select` chạy 1 lần với 2 `external_ids` + `Idempotency-Key`, 2 tài khoản mới hiện, catalog / tài khoản Hộp thư được làm mới | e2e `channels-oauth.spec.ts` |
| 4 | Given thẻ Messenger, when bấm, then vào bước 2 của Facebook Page (`via`), không tạo tài khoản type `messenger` | e2e |
| 5 | Given Page `p_dup` (409 `channel_in_use_elsewhere`) / vượt hạn mức kênh / `oauth_denied`, when Hoàn tất / quay về, then dòng Page báo inline / thông báo + "Mua thêm kênh" / "Bạn đã từ chối cấp quyền" + Thử lại; không đóng modal | `OAuthConnectStep.test.tsx` + e2e |
| 6 | Given drawer tài khoản kênh có `sync = ['messages','auto_contact']`, when mở, then khối Đồng bộ chỉ có "Tin nhắn" + "Tự tạo liên hệ"; kênh không `sync` → không có khối; "Đánh giá" không xuất hiện ở bất kỳ kênh nào | `ChannelSyncSection.test.tsx` + e2e |
| 7 | Given tài khoản OAuth `grant.access_expires_at` còn 5 ngày / tài khoản `expired`, when mở drawer, then hiện ngày hết hạn thật + cảnh báo / "Hết hạn uỷ quyền" + "Uỷ quyền lại" gọi `channel.reauthorize`; không còn chữ "54 ngày"; kênh không OAuth không có khối | e2e + component test |
| 8 | Given Hộp thư, Agents builder, form ticket / lịch hẹn, when catalog mock thêm 1 type mới có tài khoản, then chip / rail / badge / dropdown / builder / form hiện type đó với nhãn + icon catalog, không sửa component | `useChannelCatalog.test.ts` + e2e `inbox.spec.ts` / `agents.spec.ts` |
| 9 | Given parity, when `pnpm parity settings:channels settings:channel-connect settings:channel-manage inbox:default agents:builder`, then mỗi entry < 5% sau mask `PD-903` / `PD-906`; mask mỗi ID ≤ 15%; `pnpm parity --done` xanh; `pnpm lint:masks` xanh | output `pnpm parity …` |
| 10 | Given mã nguồn web, when grep mảng type kênh cứng (`'zalo_personal', 'webchat', 'email'`) và `switch` theo type ở `features/settings`, `features/inbox`, `features/agents`, `shared/forms`, then không còn (trừ test / mock / fixture) | `rg` dán report |
| 11 | Given mobile 390, when mở modal kết nối 3 bước + drawer quản lý, then không tràn ngang, vùng chạm ≥ 44px, modal / drawer toàn màn | e2e mobile 390 |
| 12 | Given i18n / token / kích thước, when `pnpm i18n:check` + `pnpm lint:tokens` + `pnpm lint:size`, then đủ khoá vi / en, không hard-code màu / px, `ManageChannelDrawer.tsx` nhỏ hơn trước và mọi file ≤ 400 | output lệnh |

- Đăng nhập Facebook / Zalo / TikTok thật và chọn Page / OA thật: chưa có adapter ở 048c, chạy bằng mock. Ghi "chưa nghiệm thu với provider thật" — nghiệm thu ở 048d / 048e / 048h.

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{web,ui}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm lint:tokens` · `pnpm lint:masks` · `pnpm i18n:check`.
- Unit web: `pnpm --filter @appchat/web exec vitest run src/shared/channels src/features/settings/components src/shared/api/mock/inbox-shape.test.ts`.
- E2E (cổng riêng, `--workers=1`): `pnpm e2e channels-oauth settings inbox agents` · `pnpm e2e mobile-sweep`.
- Parity như AC9 + `pnpm parity --done`.

## CONSTRAINTS
- **DO NOT:**
  - `switch(type)` / mảng type kênh cứng trong component (chỉ đọc catalog / manifest).
  - Viết lại luồng OAuth (popup, state, callback) — dùng `useOAuthConnect` (048).
  - Ghi dữ liệu ngoài `useAction`; `fetch` POST trong component.
  - Cho bấm kết nối kênh `coming_soon`; tạo tài khoản type `messenger`.
  - Hiện "Đánh giá" ở khối Đồng bộ; giữ chữ "54 ngày".
  - Thêm permission mới; thêm thư viện icon / UI.
  - Nhồi code vào `ManageChannelDrawer.tsx` (375 / 400), `settings/types.ts` (384), `inbox/styles/modal.styles.ts` (399), mock `inbox.ts` (382).
  - Import `features/x/components/*` chéo feature.
  - Hard-code màu / px; CSS rời; mask không có mã.
- **REUSE:**
  - `useOAuthConnect` + mock `oauth.*` (048); DTO / action / lỗi của 048b.
  - `ZaloQrStep`, `EmailConnectStep`, bước 3 cấu hình nhanh hiện có; `useAction` / `useCan`.
  - Action đồng bộ có sẵn (`sync_messages`, `sync_auto_create_contact`, `history_days`).
  - Đường mua addon kênh có sẵn; `ModalShell` / `EntityDrawer` (`packages/ui`).
- **SKIP:**
  - Adapter, webhook, cửa sổ gửi (048b / 048d / 048e / 048h).
  - Tab Bình luận, thẻ bài đăng, livestream (048f / 048g).
  - Kết nối sàn Shopee / TikTok Shop (049d).
  - "Đánh giá" (Google Business, Shopee) — ẩn.

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync` lúc ghép (Chủ thầu).
- [x] Khớp DC-911 + PD-903 / PD-906; prototype giữ ở phần đã vẽ (3 bước, bố cục thẻ, drawer); phần lệch có mã.
- [x] Một nguồn danh sách kênh cho mọi nơi nêu ở REQ-B15; Đồng bộ theo năng lực (REQ-B17); OAuth chọn nhiều tài khoản (REQ-B16).
- [x] 12 AC đo được; đăng nhập nền tảng thật ghi "chưa nghiệm thu với provider thật".
- **Gap đã khai:**
  - Icon thương hiệu prototype không có (LINE / Viber / WeChat…) vẽ tối giản, ghi report.
  - Công tắc "Bình luận" khoá "Sắp có" tới khi 048f có action.
  - PD-903 / PD-906 đang `đề xuất` (mức 1): Chủ thầu duyệt lúc verify.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; component 150–250 dòng, trần 400.
- [ ] AC 1–12 có kết quả từng cái, dán output thật (`pnpm parity …`, `pnpm e2e …`, `pnpm i18n:check`); đăng nhập nền tảng thật ghi "chưa nghiệm thu với provider thật".
- [ ] **Kênh (BUILDER-HANDOFF + omnichannel-adapter):** UI chỉ đọc manifest / catalog, không `switch(type)`; modal dựng theo `connect_kind`.
- [ ] **Action-first:** FE ghi chỉ bằng `useAction(id).run(input)` (`channel.oauth_select`, `channel.reauthorize`, action đồng bộ có sẵn).
- [ ] **UI parity:** < 5% mọi entry sau mask có mã PD-903 / PD-906; `pnpm parity --done` xanh; không hard-code màu / px; vi + en đủ; mobile 390 không tràn.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
