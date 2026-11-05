// Env của domain channels (ops §2.1 — validate lúc boot). Transport Zalo: `zca` (zca-js thật) | `fake` (Q-003 — test / e2e khi
// chưa có tài khoản Zalo phụ; cấm production). Hộp thư Email: `imap` | `fake` (TIP-018). `CHANNEL_SEND_JITTER=0` tắt trễ giống người
// (chỉ test).
import { z } from 'zod';

export const channelsEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    ZALO_TRANSPORT: z.enum(['zca', 'fake']).default('zca'),
    CHANNEL_SEND_JITTER: z.coerce.number().min(0).max(1).default(1),
    /** Chỉ với `ZALO_TRANSPORT=fake` (E2E http): khách giả nhắn tin này khi phiên bắt đầu. */
    ZALO_FAKE_GREETING: z.string().max(200).optional(),
    /** Hộp thư Email (TIP-018): `imap` (imapflow + nodemailer thật) | `fake` (bộ nhớ — test / E2E; cấm production). */
    MAIL_TRANSPORT: z.enum(['imap', 'fake']).default('imap'),
    /** Chỉ với `MAIL_TRANSPORT=fake` (E2E http): khách giả gửi thư này khi hộp thư được đăng nhập lần đầu. */
    MAIL_FAKE_GREETING: z.string().max(200).optional(),
    /** Gốc API mà widget nối Socket.IO `/widget` (mã nhúng) — production: URL công khai của API (DC-089). */
    WIDGET_API_URL: z.string().url().default('http://localhost:4000'),
    /** URL file widget.js — mặc định `<WIDGET_API_URL>/widget.js` (Blueprint §11: `widget.<domain>` phục vụ widget.js tĩnh + socket `/widget`). */
    WIDGET_SCRIPT_URL: z.string().url().optional(),
    /** CHỈ test (integration): địa chỉ fixture HTTP cục bộ được safeFetch coi như công khai khi tải ảnh đại diện — safeFetch tự bỏ qua ngoài
     *  NODE_ENV=test; production cấm đặt. */
    CHANNEL_FETCH_TEST_ALLOW: z.string().max(200).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.ZALO_TRANSPORT === 'fake') ctx.addIssue({ code: 'custom', path: ['ZALO_TRANSPORT'], message: 'fake cấm ở production' });
    if (e.NODE_ENV === 'production' && e.MAIL_TRANSPORT === 'fake') ctx.addIssue({ code: 'custom', path: ['MAIL_TRANSPORT'], message: 'fake cấm ở production' });
    if (e.NODE_ENV === 'production' && e.CHANNEL_FETCH_TEST_ALLOW) ctx.addIssue({ code: 'custom', path: ['CHANNEL_FETCH_TEST_ALLOW'], message: 'cấm ở production' });
    if (e.NODE_ENV === 'production' && e.CHANNEL_SEND_JITTER < 1) ctx.addIssue({ code: 'custom', path: ['CHANNEL_SEND_JITTER'], message: 'cấm giảm ở production' });
  });

export type ChannelsEnv = z.infer<typeof channelsEnv>;

/** Sai cấu hình → dừng boot, chỉ nêu tên biến (không in giá trị). */
export function readChannelsEnv(source: Record<string, string | undefined>): ChannelsEnv {
  const r = channelsEnv.safeParse(source);
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
