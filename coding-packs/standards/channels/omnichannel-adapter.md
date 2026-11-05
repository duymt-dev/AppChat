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
  group: 'chat' | 'social' | 'email' | 'sms' | 'web' | 'commerce';  // commerce: sàn TMĐT (P2, D04)
  status: 'ga' | 'beta' | 'coming_soon';  // coming_soon: hiện thẻ "Sắp có", không cho kết nối
  connect: { kind: 'qr' | 'oauth' | 'credentials' | 'webhook' | 'embed'; fields?: z.ZodObject<any>; riskNotice?: string };
  capabilities: {
    direct: boolean; group: boolean; createGroup?: boolean; mentions: boolean;
    reactions: boolean;                 // chỉ hiện hàng cảm xúc ở menu — KHÔNG suy ra năng lực gọi kênh
    operations?: Partial<Record<'recall' | 'react' | 'group_info' | 'group_members' | 'group_link' | 'group_add_members'
      | 'profiles' | 'friends' | 'friend_requests' | 'find_user',   // ảnh đại diện · danh bạ · lời mời kết bạn · tra một SĐT (TIP-014b D/E)
      'local' | 'remote' | 'unsupported'>>;   // vắng = unsupported (TIP-014b, DEF-001-2)
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
  send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string; parts?: ProviderMessageRef[] }>;  // lỗi giữa chừng → PartialSendError(receipt)
  probe(accountId: string): Promise<HealthStatus>;
  createGroup?(accountId: string, req: CreateGroupRequest): Promise<CreateGroupResult>;   // capabilities.createGroup (TIP-023b)
  operations?: ChannelOperations;      // chỉ hàm ứng với operations[kind] = 'remote' (packages/channels/src/operations.ts)
}
// InboundSink.event?(e: ProviderEvent) — self-listen / thu hồi / cảm xúc từ kênh, KHÔNG đi qua pipeline tin vào.
```

### Thao tác trên tin / nhóm (TIP-014b)

- Năng lực khai từng thao tác: `local` (chỉ ghi AppChat, commit ngay), `remote` (lệnh bền `channel_operation` + outbox → worker giữ phiên gọi
  kênh → chỉ ACK nhà cung cấp mới đổi tin), `unsupported` (409 trước mọi ghi). Vắng = unsupported. Core / UI / AI không `switch (type)`.
- Tham chiếu tin phía kênh lưu `message_provider_ref` (từng phần, id dạng chuỗi — không qua number). Thiếu tham chiếu cần thiết / id không an
  toàn → từ chối trước khi gọi kênh, không đoán.
- Trạng thái lệnh: `queued → dispatch_reserved → confirmed | failed | unknown | partial`; đã đặt chỗ mà gián đoạn → `unknown`, không tự thử lại.
- Ma trận năng lực từng kênh ghi ở `packages/channels/src/<kênh>/provider-capabilities.md` (Zalo: zca-js 2.2.0).
- Bạn bè / tra SĐT (`adapter.friends?: ChannelFriends`, DC-362): chỉ nhân viên bấm trên UI (action từ chối mọi nguồn khác `ui`), một người
  mỗi lệnh, trần / ngày theo tài khoản; kết quả tra tạm 24 giờ, không tự tạo khách. Không bao giờ có đường hàng loạt hay cho agent.
- Tệp chứng từ gửi ra mang `fileId` + `sha256` (bản đóng băng) — `FileFetcher(url, bind)` chỉ đọc đúng tệp đó trong kho của workspace và
  kiểm hash; sai → `attachment_binding_mismatch` trước khi gọi kênh (không tải URL ngoài cho chứng từ).

```ts

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
