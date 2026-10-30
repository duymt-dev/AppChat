// Kết nối DB (ops §2.1 — chỉ từ env). Kernel gộp schema này vào loadEnv (TIP-002).
import { z } from 'zod';

const url = z.string().regex(/^postgres(ql)?:\/\//, 'phải là URL postgresql://');

export const dbEnv = z.object({
  /** appchat_platform_app → appchat_platform. */
  PLATFORM_DATABASE_URL: url,
  /** appchat_tenant_app; host / port / user / password dùng cho mọi `ws_*`, tên DB thay theo registry. */
  TENANT_DATABASE_URL: url,
  /** appchat_provisioner (CREATEDB) — chỉ worker jobs / script. */
  PROVISIONER_DATABASE_URL: url.optional(),
  /** appchat_migrator — owner schema, chạy migration platform / template / tenant-migrate. */
  MIGRATOR_DATABASE_URL: url.optional(),
  TENANT_TEMPLATE_DB: z.string().default('appchat_tenant_template'),
  TENANT_POOL_MAX: z.coerce.number().int().min(1).max(20).default(3),
  TENANT_CLIENT_CACHE: z.coerce.number().int().min(1).default(100),
  TENANT_CLIENT_IDLE_MS: z.coerce.number().int().min(1000).default(600_000),
});

export type DbEnv = z.infer<typeof dbEnv>;

/** Đổi tên database trong URL (giữ user / host / port / password / query). */
export function withDatabase(base: string, dbName: string, host?: string | null): string {
  const u = new URL(base);
  u.pathname = `/${dbName}`;
  if (host) u.hostname = host;
  return u.toString();
}
