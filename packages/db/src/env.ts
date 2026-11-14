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
  /** Template nền chỉ extension cho khôi phục (TIP-041) — worktree k: `appchat_tenant_base_wt{k}` (TIP-035d, DC-908 d). */
  TENANT_BASE_DB: z.string().default('appchat_tenant_base'),
  /** DB nền tảng của test (DC-358) — worktree k: `appchat_platform_test_wt{k}`. */
  TEST_PLATFORM_DB: z.string().default('appchat_platform_test'),
  /** Pool DB nền tảng mỗi tiến trình (TIP-035d) — worktree đặt 4 để ba worktree + checkout chính không cạn slot Postgres dùng chung. */
  PLATFORM_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  TENANT_POOL_MAX: z.coerce.number().int().min(1).max(20).default(3),
  TENANT_CLIENT_CACHE: z.coerce.number().int().min(1).default(100),
  TENANT_CLIENT_IDLE_MS: z.coerce.number().int().min(1000).default(600_000),
});

export type DbEnv = z.infer<typeof dbEnv>;

/** `PLATFORM_POOL_MAX` của env (mặc định 10) — cho script dựng client nền tảng ngoài kernel. */
export const platformPoolMax = (src: Record<string, string | undefined> = process.env): number => dbEnv.shape.PLATFORM_POOL_MAX.parse(src.PLATFORM_POOL_MAX);

/** Đổi tên database trong URL (giữ user / host / port / password / query). */
export function withDatabase(base: string, dbName: string, host?: string | null): string {
  const u = new URL(base);
  u.pathname = `/${dbName}`;
  if (host) u.hostname = host;
  return u.toString();
}
