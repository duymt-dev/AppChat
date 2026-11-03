// Shape đọc trang Cài đặt › Kênh kết nối (FE ↔ BE — gap-filling §5, TIP-014; Blueprint §4.4 channels, REQ-B09 / B11):
// `GET /v1/settings/channels?filter=all|on|off` (nhóm theo type, `accounts[]`), `GET /v1/settings/channels/:id/stats?days=7`,
// `GET /v1/settings/channels/:id/login` (trạng thái QR Zalo — FE chưa có client WS). Mock transport parse cùng schema.
import { z } from 'zod';

export const CHANNEL_HEALTH = ['good', 'slow', 'down', 'off'] as const;
export const CHANNEL_AI_MODES = ['auto', 'suggest', 'off'] as const;
export const CHANNEL_ASSIGN_MODES = ['round_robin', 'least_busy', 'shift'] as const;
export const CHANNEL_HISTORY_DAYS = [0, 7, 30, 90] as const;

export const channelAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  connected: z.boolean(),
  convs: z.number().int(),
  /** FRT trung bình dạng `1'12` (phút'giây), `—` khi chưa có dữ liệu. */
  frt: z.string(),
  health: z.enum(CHANNEL_HEALTH),
  /** Tên AI Agent trực (hiển thị) — '' khi chưa gán. */
  agent: z.string(),
  /** Id AI Agent trực (giá trị chọn của drawer / wizard). */
  agent_id: z.string().optional(),
  ai_mode: z.enum(CHANNEL_AI_MODES),
  hours: z.string(),
  greeting: z.string(),
  assign_mode: z.enum(CHANNEL_ASSIGN_MODES),
  sla_policy: z.string(),
  sync_messages: z.boolean(),
  sync_auto_create_contact: z.boolean(),
  history_days: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)]),
  paused: z.boolean(),
  /** Trạng thái chi tiết của tài khoản (`channel_account.status`) — FE chưa dùng. */
  status: z.string().optional(),
});
export type ChannelAccountDto = z.infer<typeof channelAccountSchema>;

export const settingsChannelSchema = z.object({
  type: z.string(),
  name: z.string(),
  short: z.string(),
  color: z.string(),
  group: z.enum(['msg', 'web', 'shop']),
  label: z.enum(['', 'pop', 'beta']),
  available: z.boolean(),
  accounts: z.array(channelAccountSchema),
  connected: z.boolean(),
  health: z.enum(CHANNEL_HEALTH),
  convs: z.number().int(),
  frt: z.string(),
  account: z.string(),
  agent: z.string(),
});
export type SettingsChannelDto = z.infer<typeof settingsChannelSchema>;
export const settingsChannelListSchema = z.array(settingsChannelSchema);

export const channelAccountStatsSchema = z.object({
  account_id: z.string(),
  /** 7 ngày gần nhất, `day` 0 = cũ nhất. */
  days: z.array(z.object({ day: z.number().int(), convs: z.number().int(), frt_sec: z.number().int() })),
  total_convs: z.number().int(),
});

export const LOGIN_STATUSES = ['starting', 'waiting', 'scanned', 'connected', 'expired', 'declined', 'failed'] as const;
/** Trạng thái đăng nhập QR của một tài khoản đang kết nối. `qr` = PNG base64 khi `waiting`. `attempt` = lần kết nối (start / reconnect —
 *  TIP-023c): sự kiện của lần cũ không ghi đè lần mới; `rev` tăng mỗi lần đổi trạng thái của cùng lần. */
export const channelLoginStateSchema = z.object({
  account_id: z.string(),
  status: z.enum(LOGIN_STATUSES),
  qr: z.string().nullable(),
  expires_at: z.string().nullable(),
  attempt: z.string().optional(),
  rev: z.number().int().optional(),
});
export type ChannelLoginStateDto = z.infer<typeof channelLoginStateSchema>;

/** `channel.status` (TIP-023c, khối `qr`): trạng thái đã làm sạch cho Trợ lý — KHÔNG có ảnh QR (ảnh lấy riêng qua `qr_ref` có auth). */
export const GENUI_LOGIN_STATUSES = ['waiting', 'scanned', 'connected', 'expired', 'failed'] as const;
export const channelStatusSchema = z.object({
  channel_account_id: z.string(),
  type: z.string(),
  name: z.string(),
  account_status: z.string(),
  login: z
    .object({
      attempt: z.string().nullable(),
      status: z.enum(GENUI_LOGIN_STATUSES),
      reason: z.enum(['declined', 'timeout', 'duplicate', 'unknown']).optional(),
      expires_at: z.string().nullable(),
      /** Đường đọc ảnh QR (có auth, chỉ khi `waiting`) — không phải ảnh; không đưa vào model / lịch sử. */
      qr_ref: z.string().nullable(),
      terminal: z.boolean(),
    })
    .nullable(),
});
export type ChannelStatusDto = z.infer<typeof channelStatusSchema>;

/** Native 7 trạng thái → 5 trạng thái của khối `qr` (standard §2 DC-227): starting→waiting, declined→failed(reason). */
export function genUiLoginStatus(s: ChannelLoginStateDto['status']): { status: (typeof GENUI_LOGIN_STATUSES)[number]; reason?: 'declined' } {
  if (s === 'starting') return { status: 'waiting' };
  if (s === 'declined') return { status: 'failed', reason: 'declined' };
  return { status: s };
}

/**
 * Form kết nối Email (TIP-018, prototype L11254: Máy chủ IMAP · Cổng · Email · Mật khẩu ứng dụng; SMTP suy từ IMAP khi bỏ trống).
 * `channel.test` (type email) và `channel.email.connect` nhận cùng các trường dạng chuỗi (form gửi `Record<string, string>`).
 */
export const EMAIL_FIELDS = ['imap_host', 'imap_port', 'user', 'password', 'smtp_host', 'smtp_port'] as const;

const host = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
const port = z.coerce.number().int().min(1).max(65535);

export const emailFormSchema = z.object({
  imap_host: host,
  imap_port: port.default(993),
  user: z.string().trim().max(120).optional(),
  password: z.string().min(1).max(200),
  smtp_host: host.optional(),
  smtp_port: port.optional(),
});
export type EmailForm = z.infer<typeof emailFormSchema>;

/** SMTP mặc định suy từ IMAP: `imap.x` → `smtp.x`, cổng 465 (SSL). */
export function smtpOf(f: Pick<EmailForm, 'imap_host' | 'smtp_host' | 'smtp_port'>): { smtp_host: string; smtp_port: number } {
  return { smtp_host: f.smtp_host || f.imap_host.replace(/^imap\./, 'smtp.'), smtp_port: f.smtp_port ?? 465 };
}
