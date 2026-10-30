// Schema env validate lúc boot (ops §2.1). TIP sau thêm biến của mình vào `baseEnv` (DB, Redis, khoá mã hoá…).
import { z } from 'zod';

export const baseEnv = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  ROLE: z.enum(['channels', 'ai', 'jobs', 'all']).default('all'),
});

export type Env = z.infer<typeof baseEnv>;

export class EnvError extends Error {
  constructor(readonly keys: string[]) {
    super(`Biến môi trường không hợp lệ: ${keys.join(', ')}`);
    this.name = 'EnvError';
  }
}

/** Chỉ nêu tên biến sai, không in giá trị (có thể là bí mật). */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const r = baseEnv.safeParse(source);
  if (!r.success) throw new EnvError([...new Set(r.error.issues.map((i) => String(i.path[0])))]);
  return r.data;
}
