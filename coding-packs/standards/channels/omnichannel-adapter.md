# Omnichannel — Channel Adapter

> Mục tiêu: thêm một kênh mới (Zalo OA, Messenger, Instagram, Telegram, WhatsApp, TikTok, SMS…) = **thêm một adapter + một bản ghi manifest**. Không sửa Inbox, CRM, AI hay schema DB.
> Kênh phát hành: `zalo_personal`, `webchat`, `email`. Các kênh khác dùng cùng khung, bật khi có adapter.

## Quy tắc

1. **Mọi kênh đi qua `ChannelAdapter`** (`packages/channels/src/<type>/`). Core không được `import` SDK của kênh (`zca-js`, `imapflow`, Graph API…); chỉ adapter được import.
2. **Mỗi adapter khai báo một `ChannelManifest`.** UI (modal kết nối, Cài đặt → Kênh, Inbox filter, icon) và AI (giới hạn ký tự, loại tin hỗ trợ) **chỉ đọc manifest**, không `switch(type)` rải rác.
3. **`type` là chuỗi trong registry**, không phải Postgres enum. Thêm kênh không cần migration.
   - Cột `channel_account.type text` + CHECK theo danh sách trong code.
   - Hoặc không CHECK, validate bằng zod ở tầng service.
4. **Chuẩn hoá vào/ra:** inbound luôn thành `NormalizedInbound`; outbound luôn nhận `OutboundMessage`. Định dạng riêng của kênh (Zalo rich text, email HTML, template Messenger…) do adapter tự chuyển.
5. **Chống trùng ở DB:** `UNIQUE(channel_account_id, external_msg_id)`. Adapter phải cung cấp `externalMsgId` ổn định. Nếu kênh không có thì dùng hash nội dung + thời điểm.
6. **Gửi luôn qua outbox + rate limiter của kênh.** Không gửi đồng bộ trong request.
   - Limiter lấy từ `manifest.rateLimit`, được ghi đè bằng `channel_account.settings`.
7. **Kiểu kết nối khai báo trong manifest:** `connect.kind = 'qr' | 'oauth' | 'credentials' | 'webhook' | 'embed'`. Modal kết nối dựng form từ kiểu này cộng `connect.fields` (zod schema).
8. **Session dài (Zalo, IMAP) dùng lease** (`lease:channel:{id}`) trong `worker-channels`. Kênh webhook (OA, Meta…) không cần lease; route `/hooks/channels/:type/:accountKey` tra `tenant_channel_route` để biết DB đích.
9. **Health chuẩn hoá:** `probe()` trả `connected | degraded | error | expired`. Trạng thái này ghi vào `channel_account.status` và phát metric `channel_account_status{type}`.
10. **Credential mã hoá** AES-256-GCM (`credentials_enc`). Không log, không trả về API.

## Hợp đồng

```ts
// packages/channels/src/types.ts
export interface ChannelManifest {
  type: string;                         // 'zalo_personal' | 'webchat' | 'email' | 'zalo_oa' | 'messenger' | ...
  label: string;                        // i18n key 'channels.zalo_personal.label'
  icon: string;                         // key icon trong packages/ui
  group: 'chat' | 'social' | 'email' | 'sms' | 'web';
  status: 'ga' | 'beta' | 'coming_soon';  // coming_soon: hiện thẻ "Sắp có", không cho kết nối
  connect: { kind: 'qr' | 'oauth' | 'credentials' | 'webhook' | 'embed'; fields?: z.ZodObject<any>; riskNotice?: string };
  capabilities: {
    direct: boolean; group: boolean; mentions: boolean;
    send: Array<'text' | 'image' | 'file' | 'sticker' | 'audio' | 'card' | 'template'>;
    maxTextLength: number; markdown: 'none' | 'rich' | 'html';
    proactive: 'allowed' | 'window_24h' | 'template_only' | 'disallowed';   // gửi chủ động (marketing / follow-up)
  };
  rateLimit: { perMinute: number; perDayProactive?: number; jitterMs?: [number, number] };
  session: 'lease' | 'webhook' | 'poll';
}

export interface ChannelAdapter {
  manifest: ChannelManifest;
  start?(account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;   // lease / poll
  stop?(accountId: string): Promise<void>;
  handleWebhook?(req: RawWebhook, account: ChannelAccountRuntime, sink: InboundSink): Promise<void>; // webhook
  send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }>;
  probe(accountId: string): Promise<HealthStatus>;
}

// packages/channels/src/registry.ts — DUY NHẤT nơi liệt kê kênh
export const channelRegistry = defineChannels([zaloPersonal, webchat, email /*, zaloOa, messenger … */]);
```

## Thêm một kênh mới (checklist)

1. Tạo `packages/channels/src/<type>/{manifest.ts, adapter.ts, normalize.ts, render.ts}` cùng test riêng (`*.test.ts`).
2. Đăng ký vào `channelRegistry`.
3. Thêm i18n `channels.<type>.*` (vi + en) và icon vào `packages/ui`.
4. Nếu dùng webhook: thêm xác thực chữ ký trong `handleWebhook`, route dùng chung `/hooks/channels/:type/:accountKey`.
5. Test contract dùng chung (`channels/contract.test.ts`) phải pass cho adapter mới: normalize, dedupe, send, probe, chặn gửi khi vượt rate limit.
6. **Không** sửa `inbox/`, `crm/`, `ai/`. Nếu phải sửa thì manifest đang thiếu một capability → bổ sung capability vào manifest trước.

## Ví dụ sai

```ts
// ❌ core rẽ nhánh theo kênh
if (conv.channelType === 'zalo_personal') text = toZaloRich(text);
// ✅ adapter tự render theo manifest.capabilities.markdown
await outbox.enqueue({ accountId, message: { kind: 'text', text } });
```

## Lý do

- RRI REQ-B08: các kênh P2 phải thêm được mà không đập lại.
- Prototype có 16 kênh trong Cài đặt → Kênh và 13 kênh trong modal kết nối. Phát hành chỉ bật 3 kênh; số còn lại hiện theo `status` của manifest.
