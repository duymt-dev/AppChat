# TIP-048c — exact file manifest

M = sửa, C = tạo mới. Mọi path M đã có trên cây hiện tại.
- TIP-048 tạo `apps/web/src/shared/oauth/useOAuthConnect.ts` và `apps/web/src/shared/api/mock/domains/oauth.ts`: 048c chỉ dùng, không sửa (không nằm trong bảng).
- TIP-048b cung cấp DTO danh mục kênh (`channelCatalogItemSchema`), action `channel.oauth_select` / `channel.reauthorize`, mã lỗi `channel_in_use_elsewhere`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `apps/web/src/shared/channels/useChannelCatalog.ts` | Một nguồn danh sách kênh (`GET /inbox/connect-channels`): `catalog`, `byType`, `connectable`, `soon`, `filterable`, `icon`, `label` |
| C | `apps/web/src/shared/channels/useChannelCatalog.test.ts` | Lọc theo `status`, `via`, `connect_kind`; nhãn / icon; kênh lạ |
| C | `apps/web/src/features/settings/channel-oauth-types.ts` | Kiểu bước OAuth, tài khoản chọn, cấu hình nhanh |
| C | `apps/web/src/features/settings/components/OAuthConnectStep.tsx` | Bước 2 OAuth: đăng nhập nền tảng (`useOAuthConnect`) → chọn Page / OA / tài khoản |
| C | `apps/web/src/features/settings/components/OAuthConnectStep.test.tsx` | Chọn nhiều, tài khoản đã gắn nơi khác, `oauth_error`, huỷ |
| C | `apps/web/src/features/settings/components/OAuthQuickSetup.tsx` | Bước 3: tên hiển thị, agent, chế độ AI, phân công → `channel.oauth_select` |
| C | `apps/web/src/features/settings/components/ChannelSyncSection.tsx` | Khối Đồng bộ tách khỏi drawer, mục theo `capabilities.sync` |
| C | `apps/web/src/features/settings/components/ChannelSyncSection.test.tsx` | Mục hiện / ẩn theo `sync`; "Đánh giá" không bao giờ hiện |
| C | `apps/web/src/features/settings/components/ChannelGrantInfo.tsx` | Hạn uỷ quyền thật + nút Uỷ quyền lại (`channel.reauthorize`) |
| M | `apps/web/src/features/settings/components/ConnectChannelModal.tsx` | Bỏ `PICKABLE` cứng; danh sách từ catalog; bước 2 rẽ theo `connect_kind`; `via`; "Sắp có" |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | Thay khối Đồng bộ bằng `ChannelSyncSection`; thêm `ChannelGrantInfo`; số dòng phải giảm |
| M | `apps/web/src/features/settings/components/ChannelCard.tsx` | Icon / nhãn / trạng thái từ catalog; "Sắp có"; badge "Hết hạn uỷ quyền" |
| M | `apps/web/src/features/settings/components/ChannelsSection.tsx` | Thứ tự / nhóm theo catalog; mở modal theo `?connect=` |
| M | `apps/web/src/features/settings/channel-types.ts` | Kiểu danh mục từ DTO 048b; bỏ union type cứng |
| M | `apps/web/src/features/settings/api.ts` | Kiểu `/settings/channels` thêm `external_id` / `grant` (chỉ đọc) |
| M | `apps/web/src/features/inbox/components/ConnectChannelModal.tsx` | Picker từ catalog; giữ `?connect=<type>` (thẻ `via` chuyển type đích) |
| M | `apps/web/src/features/inbox/components/FolderRail.tsx` | Mục KÊNH từ catalog (kênh có tài khoản) |
| M | `apps/web/src/features/inbox/components/ConversationList.tsx` | Chip kênh từ catalog |
| M | `apps/web/src/features/inbox/components/ConvRow.tsx` | Badge kênh từ catalog (kênh lạ → icon chung) |
| M | `apps/web/src/features/inbox/types.ts` | `ChannelType` = `string` từ catalog (bỏ union 3 kênh) |
| M | `apps/web/src/shared/forms/ChannelSelect.tsx` | Tuỳ chọn kênh từ catalog ∩ danh sách nghiệp vụ |
| M | `apps/web/src/features/tickets/types.ts` | Kênh ticket theo `TICKET_CHANNELS` (shared), bỏ union cứng |
| M | `apps/web/src/features/agents/hooks/useAgentBuilder.ts` | Kênh trực của agent từ catalog |
| M | `apps/web/src/features/agents/components/builder/RoutingSection.tsx` | Chip kênh từ catalog, "Sắp có" khoá |
| M | `apps/web/src/features/agents/components/builder/TestPanel.tsx` | Chọn kênh thử từ catalog |
| M | `packages/ui/src/icons/paths.ts` | Icon thương hiệu: facebook, messenger, instagram, tiktok, shopee, whatsapp, telegram, line, viber, wechat, zalo |
| C | `apps/web/src/shared/api/mock/domains/channel-oauth.ts` | `MOCK_CHANNEL_CATALOG`; mock `channel.oauth_select` / `channel.reauthorize` (409 nơi khác, hạn mức) |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` | Nhóm kênh theo catalog; trường `connect_kind` / `oauth` / `via` / `sync` / `grant` |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Một dòng ~L135: `/inbox/connect-channels` trả `MOCK_CHANNEL_CATALOG` (file 382 dòng, không thêm logic) |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký handler `channel-oauth` |
| M | `apps/web/src/shared/api/mock/inbox-shape.test.ts` | Shape catalog (`connectChannelsSchema` mới) |
| M | `fixtures/prototype-parity/settings.json` | Kênh theo registry; trường danh mục; tài khoản mẫu có `grant` |
| M | `apps/web/messages/vi/settings.json` | Bước OAuth, cấu hình nhanh, Đồng bộ, uỷ quyền, "Sắp có", lỗi |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Nhãn kênh mới ở picker / chip / rail |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `tools/parity/parity.manifest.ts` | Mask PD-903 (danh sách kênh) / PD-906 (khối Đồng bộ, hạn uỷ quyền) |
| C | `apps/web/e2e/channels-oauth.spec.ts` | Luồng OAuth 3 bước, Messenger → Facebook, "Sắp có", Uỷ quyền lại, mobile 390 |
| M | `apps/web/e2e/settings.spec.ts` | Bỏ khẳng định số type cứng (~L105) |
| M | `apps/web/e2e/inbox.spec.ts` | Picker / chip theo catalog (~L74) |
| M | `apps/web/e2e/agents.spec.ts` | Bỏ ca cấm chữ "Facebook" (~L30) |
