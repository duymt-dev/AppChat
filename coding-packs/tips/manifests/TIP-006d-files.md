# TIP-006d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/platform/notify.prisma` | Bảng push_subscription |
| C | `packages/db/prisma/platform/migrations/20261108000000_push_subscription/migration.sql` | Migration + index |
| M | `packages/actions/src/settings.ts` | Action push_subscribe / push_unsubscribe / push_test |
| C | `packages/core/src/notify/actions/notification-push.handlers.ts` | Handler 3 action push |
| C | `packages/core/src/notify/push/push-sender.ts` | Gửi web-push + VAPID + xử lý 404/410 |
| C | `packages/core/src/notify/push/push-payload.ts` | Payload tối thiểu theo locale |
| C | `packages/core/src/notify/jobs/notify-push.processor.ts` | Processor queue notify-push |
| M | `packages/core/src/notify/jobs/notify.jobs.module.ts` | Đăng ký queue notify-push |
| M | `packages/core/src/notify/services/notifier.ts` | Enqueue push khi ch.mobile + ngoài DND |
| M | `packages/core/src/notify/notify.module.ts` | Provider push |
| M | `apps/api/src/http/notify/notify.controller.ts` | GET VAPID public key + danh sách thiết bị |
| C | `packages/core/test/notify-push.test.ts` | Unit notifier/payload/sender |
| C | `apps/api/test/integration/web-push.test.ts` | Integration push giả, 410, chạy lại, thiếu VAPID, quyền self |
| C | `apps/web/public/manifest.webmanifest` | PWA manifest |
| C | `apps/web/public/sw.js` | Service worker push + notificationclick |
| M | `apps/web/src/app/layout.tsx` | Khai manifest + icon |
| C | `apps/web/src/shared/notify/usePushSubscription.ts` | Hook đăng ký push |
| C | `apps/web/src/features/settings/components/PushDeviceBlock.tsx` | Khối thông báo đẩy + hướng dẫn iPhone |
| M | `apps/web/src/features/settings/components/NotifSection.tsx` | Gắn PushDeviceBlock |
| M | `apps/web/messages/vi/settings.json` | Chuỗi vi |
| M | `apps/web/messages/en/settings.json` | Chuỗi en |
| C | `apps/web/e2e/http/web-push.spec.ts` | E2E bật push + mở link + iPhone hướng dẫn |
| M | `.env.example` | VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT |
