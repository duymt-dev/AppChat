# TIP-048d — exact file manifest

M = sửa, C = tạo mới. M path tương lai do TIP-048 / 048b tạo (cần 048 → 048b → 048c đã tích hợp):
- `packages/channels/src/webhook.ts` (048b) — hợp đồng `ChannelWebhook` / `HookItem` mà `zalo-oa/webhook.ts` cài; 048d chỉ đọc, không sửa.
- `packages/channels/src/zalo-oa/oauth.ts` (048) nằm cùng thư mục; 048d không sửa.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/channels/src/zalo-oa/manifest.ts` | Manifest `zalo_oa` GA: `connect.oauth` (`zalo_oa`, không picker), `window` 168 giờ → blocked, `sync` messages / auto_contact, send text / image / file, 2000 ký tự |
| C | `packages/channels/src/zalo-oa/adapter.ts` | `ZaloOaAdapter`: `webhook`, `handleWebhook` (tin vào / echo / đã xem / cảm xúc / quan tâm / `user_submit_info`), `send` có ledger, `probe` (`getoa`) |
| C | `packages/channels/src/zalo-oa/webhook.ts` | `verify` `X-ZEvent-Signature` = sha256(appId + data + timeStamp + OA secret key) so khớp an toàn; `split` theo `oa_id` → `zalo_oa:<oa_id>`, `eventKey`, `kind` |
| C | `packages/channels/src/zalo-oa/normalize.ts` | Sự kiện Zalo → `NormalizedInbound` / `ProviderEvent`; bảng mã cảm xúc → 6 emoji |
| C | `packages/channels/src/zalo-oa/render.ts` | Chia đoạn ≤ 2000, bỏ đánh dấu; kiểm loại / cỡ tệp (ảnh 1MB, GIF / file 5MB) |
| C | `packages/channels/src/zalo-oa/api.ts` | OpenAPI v3: `message/cs`, upload ảnh / GIF / file, `user/detail`, `getoa`; `HttpZaloOaTransport` (`fetch` Node 24, timeout 10 giây); bảng mã lỗi → lỗi adapter; kiểu `ZaloOaTransport` + `ZaloOaLimiter` |
| C | `packages/channels/src/zalo-oa/fake-transport.ts` | Transport giả tất định: `sent[]`, `uploads[]`, `failNext(code)`, `signedHook(event)` |
| C | `packages/channels/src/zalo-oa/provider-capabilities.md` | Ma trận năng lực + sự kiện + lỗi + giới hạn + việc vận hành; "Kiểm thật" CHỜ-TK (Q-909) |
| M | `packages/channels/src/operations.ts` | `ProviderEvent` thêm `{ kind: 'contact_info' }` (SĐT khách chia sẻ) |
| M | `packages/channels/src/registry.ts` | `ChannelDeps.zaloOa` → gắn `ZaloOaAdapter`; thiếu cấu hình → `zalo_oa` "Sắp có" |
| M | `packages/channels/src/coming-soon.ts` | Bỏ dòng `zalo_oa` |
| M | `packages/channels/src/index.ts` | Export adapter, transport, `ZaloOaLimiter` |
| C | `packages/channels/test/zalo-oa.test.ts` | Unit: verify, split, normalize từng fixture, render, kiểm tệp, bảng lỗi, ledger |
| C | `packages/channels/test/fixtures/zalo-oa/user_send_text.json` | Fixture tin chữ |
| C | `packages/channels/test/fixtures/zalo-oa/user_send_image.json` | Fixture tin ảnh |
| C | `packages/channels/test/fixtures/zalo-oa/follow.json` | Fixture quan tâm OA |
| C | `packages/channels/test/fixtures/zalo-oa/unfollow.json` | Fixture bỏ quan tâm |
| C | `packages/channels/test/fixtures/zalo-oa/user_submit_info.json` | Fixture khách chia sẻ SĐT |
| C | `packages/channels/test/fixtures/zalo-oa/oa_send_text.json` | Fixture echo tin OA gửi từ app khác |
| M | `packages/channels/test/registry.test.ts` | `zalo_oa` GA + kết nối được; `buildChannelRegistry({ zaloOa })` gắn adapter |
| C | `packages/core/src/channels/zalo-oa/app-limiter.ts` | Limiter Redis (Lua) hai tầng: App 4.000 / phút chung mọi OA (env 3.600) + OA theo `settings.oa_tier`; −32 → chậm lại; quota upload / tháng |
| C | `packages/core/src/channels/operations/contact-info.ts` | Áp `contact_info`: điền SĐT khi khách chưa có, khác số / số của khách khác → chỉ gợi ý trên dòng thời gian |
| M | `packages/core/src/channels/operations/provider-event.ts` | Rẽ `contact_info` → `contact-info.ts` |
| M | `packages/core/src/channels/channels.module.ts` | `channelRegistryFor`: transport `http` / `fake` + limiter Redis |
| M | `packages/core/src/channels/channels.env.ts` | `ZALO_OA_TRANSPORT`, `ZALO_OA_SECRET_KEY`, `ZALO_OA_APP_RPM`, `ZALO_OA_UPLOAD_MONTHLY`; `fake` cấm production |
| M | `.env.example` | Khối "Zalo OA" dưới khối App Zalo của 048 |
| M | `tools/scripts/e2e-http.mjs` | Worker channels + API chạy `ZALO_OA_TRANSPORT=fake` + khoá ký test |
| M | `packages/shared/src/i18n/server/vi/channels.ts` | `name.zalo_oa`; lỗi gói / cửa sổ / rate / tệp / quota; gợi ý SĐT |
| M | `packages/shared/src/i18n/server/en/channels.ts` | Như trên (en) |
| M | `apps/web/messages/vi/settings.json` | `channels.zalo_oa.label` (nếu thiếu), `channels.zalo_oa.plan_notice` |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| C | `apps/api/test/integration/zalo-oa.test.ts` | AC1–9, AC11: webhook ký thật / sai, trùng, echo, cửa sổ, tệp, rate hai tầng, token hỏng, SĐT, sự kiện phụ, env |
| M | `apps/api/test/integration/channels.test.ts` | `/settings/channels`: `zalo_oa` `available: true`, đếm on / off mới |
| M | `apps/web/e2e/http/channels.spec.ts` | Thẻ Zalo OA bật; OAuth giả → kết nối → webhook → Hộp thư → trả lời |
