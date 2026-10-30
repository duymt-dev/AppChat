// Env của domain channels (ops §2.1 — validate lúc boot). Transport Zalo: `zca` (zca-js thật) | `fake` (Q-003 — test / e2e khi
// chưa có tài khoản Zalo phụ; cấm production). `CHANNEL_SEND_JITTER=0` tắt trễ giống người (chỉ test).
import { z } from 'zod';

export const channelsEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    ZALO_TRANSPORT: z.enum(['zca', 'fake']).default('zca'),
    CHANNEL_SEND_JITTER: z.coerce.number().min(0).max(1).default(1),
    /** Chỉ với `ZALO_TRANSPORT=fake` (E2E http): khách giả nhắn tin này khi phiên bắt đầu. */
    ZALO_FAKE_GREETING: z.string().max(200).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.ZALO_TRANSPORT === 'fake') ctx.addIssue({ code: 'custom', path: ['ZALO_TRANSPORT'], message: 'fake cấm ở production' });
    if (e.NODE_ENV === 'production' && e.CHANNEL_SEND_JITTER < 1) ctx.addIssue({ code: 'custom', path: ['CHANNEL_SEND_JITTER'], message: 'cấm giảm ở production' });
  });

export type ChannelsEnv = z.infer<typeof channelsEnv>;

/** Sai cấu hình → dừng boot, chỉ nêu tên biến (không in giá trị). */
export function readChannelsEnv(source: Record<string, string | undefined>): ChannelsEnv {
  const r = channelsEnv.safeParse(source);
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
