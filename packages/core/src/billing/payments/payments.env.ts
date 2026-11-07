// Env thu phí nền tảng (TIP-010, provider-ports §2: kết nối của nền tảng cấu hình ở env, không ở workspace). Tài khoản nhận tiền
// AppChat + nguồn đối soát: `mock` (dev / test — HMAC `MOCK_BANK_FEED_KEY`) | `sepay` (webhook `Authorization: Apikey`).
import { z } from 'zod';

export const PAYMENTS_ENV = Symbol('PAYMENTS_ENV');

const paymentsEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Mã BIN NAPAS (6 số) của ngân hàng nhận tiền — Vietcombank 970436. */
    PLATFORM_BANK_BIN: z.string().regex(/^\d{6}$/).default('970436'),
    PLATFORM_BANK_NAME: z.string().min(1).default('Vietcombank'),
    PLATFORM_BANK_ACCOUNT_NO: z.string().regex(/^\d{6,19}$/).default('0071000888999'),
    PLATFORM_BANK_ACCOUNT_NAME: z.string().min(1).default('CTY CP APPCHAT'),
    PLATFORM_BANK_FEED: z.enum(['mock', 'sepay']).default('mock'),
    SEPAY_WEBHOOK_KEY: z.string().optional(),
    MOCK_BANK_FEED_KEY: z.string().default('mock-bank-feed-dev'),
  })
  .superRefine((e, ctx) => {
    if (e.PLATFORM_BANK_FEED === 'sepay' && !e.SEPAY_WEBHOOK_KEY) ctx.addIssue({ code: 'custom', path: ['SEPAY_WEBHOOK_KEY'], message: 'required' });
    if (e.NODE_ENV === 'production' && e.PLATFORM_BANK_FEED === 'mock') ctx.addIssue({ code: 'custom', path: ['PLATFORM_BANK_FEED'], message: 'mock cấm ở production' });
  });

export type PaymentsEnv = z.infer<typeof paymentsEnv>;

export function readPaymentsEnv(source: Record<string, string | undefined>): PaymentsEnv {
  const r = paymentsEnv.safeParse(source);
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
