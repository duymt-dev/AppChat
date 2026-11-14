# TIP-014c — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/web/src/features/settings/components/ZaloQrStep.tsx` | Cảnh báo rủi ro |
| M | `apps/web/src/features/settings/components/ConnectChannelModal.tsx` | Đọc manifest |
| M | `apps/web/src/features/settings/components/ChannelCard.tsx` | Đọc manifest |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` | Đọc manifest |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` | SLA theo tài khoản |
| M | `packages/core/src/channels/services/accounts.service.ts` | Đọc sla_policy |
| M | `apps/web/src/features/inbox/components/ConvMenu.tsx` | Mốc tạm ẩn |
| C | `apps/web/src/features/inbox/components/SnoozePicker.tsx` | Chọn thời điểm |
| M | `apps/web/messages/vi/settings.json` | Rủi ro Zalo |
| M | `apps/web/messages/en/settings.json` | Zalo risk |
| M | `apps/web/messages/vi/inbox.json` | Tạm ẩn |
| M | `apps/web/messages/en/inbox.json` | Snooze |
| C | `apps/api/test/integration/channel-sla.test.ts` | SLA theo tài khoản |
| C | `apps/web/src/features/inbox/components/SnoozePicker.test.tsx` | Mốc |
| C | `apps/web/src/features/inbox/components/AgentToolsMenu.test.tsx` | Test khoá D48 |
| M | `tools/parity/parity.manifest.ts` | Mask lưới kênh DC-295 |
