// Env của domain identity (ops §2.1 — validate lúc boot). Mail / tra MST chọn adapter theo env; adapter dev bị cấm ở production.
import { z } from 'zod';

export const identityEnv = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Khoá HS256 hiện tại (≥ 32 byte); `JWT_SECRETS_OLD` = "kid:secret,…" giữ khoá cũ khi xoay. */
    JWT_SECRET: z.string().min(32),
    JWT_KID: z.string().min(1).default('k1'),
    JWT_SECRETS_OLD: z.string().optional(),
    /** console (dev / test: giữ thư trong bộ nhớ + log không PII) | brevo (D34). */
    MAIL_PROVIDER: z.enum(['console', 'brevo']).default('console'),
    BREVO_API_KEY: z.string().optional(),
    MAIL_FROM_EMAIL: z.string().email().default('no-reply@appchat.vn'),
    MAIL_FROM_NAME: z.string().default('AppChat'),
    /** mock (fixture) | vietqr (OQ-05). */
    TAX_LOOKUP_PROVIDER: z.enum(['mock', 'vietqr']).default('mock'),
    /** Gốc link trong email (đặt lại mật khẩu, lời mời). */
    APP_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
    /** Cookie refresh có Secure — tắt được ở dev http. */
    COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV === 'production' && e.MAIL_PROVIDER === 'console') ctx.addIssue({ code: 'custom', path: ['MAIL_PROVIDER'], message: 'console cấm ở production' });
    if (e.MAIL_PROVIDER === 'brevo' && !e.BREVO_API_KEY) ctx.addIssue({ code: 'custom', path: ['BREVO_API_KEY'], message: 'required' });
  });

export type IdentityEnv = z.infer<typeof identityEnv>;

/** Đủ biến để bật identity (JWT_SECRET) — thiếu thì domain không đăng ký service auth (process không cần, vd. test health). */
export function readIdentityEnv(source: Record<string, string | undefined>): IdentityEnv | null {
  if (!source.JWT_SECRET) return null;
  const r = identityEnv.safeParse(source);
  if (!r.success) throw new Error(`Biến môi trường không hợp lệ: ${[...new Set(r.error.issues.map((i) => String(i.path[0])))].join(', ')}`);
  return r.data;
}
