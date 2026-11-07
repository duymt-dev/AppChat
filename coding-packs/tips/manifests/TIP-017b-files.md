# TIP-017b — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/actions/src/settings-apps.ts` | update_widget logo/actions, create_widget |
| M | `packages/core/src/channels/webchat/widget.service.ts` | Nhiều widget, agent phân trang |
| M | `packages/core/src/channels/webchat/webchat.handlers.ts` | create_widget |
| M | `packages/core/src/channels/webchat/publisher.ts` | agent.status/typing |
| M | `apps/api/src/http/channels/widget.gateway.ts` | Phát tới khách |
| M | `apps/api/src/http/notify/realtime/ws.gateway.ts` | Chuyển typing nhân viên |
| M | `apps/widget/src/ui.ts` | Logo, nút, trạng thái |
| M | `apps/widget/src/main.ts` | Sự kiện |
| M | `apps/widget/src/types.ts` | Kiểu |
| M | `apps/web/src/features/settings/components/WidgetSection.tsx` | Nút hành động, danh sách widget |
| M | `apps/web/src/features/settings/components/WidgetPreview.tsx` | Logo |
| C | `apps/web/src/features/settings/components/WidgetActionsEditor.tsx` | Sửa nút |
| M | `packages/db/prisma/tenant/channels-webchat.prisma` | logo_file_id |
| C | `packages/db/prisma/tenant/migrations/20261102006400_widget_logo/migration.sql` | Cột logo |
| M | `apps/web/messages/vi/settings.json` | Chuỗi |
| M | `apps/web/messages/en/settings.json` | Strings |
| C | `apps/api/test/integration/webchat-multi.test.ts` | Nhiều widget + agent |
