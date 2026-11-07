// Helper integration: đọc .env do `db:setup` sinh (role thật), dọn DB ws_* của test.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { testDbEnv } from '../../src/test-env';

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');

function readEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
}

const raw = { ...readEnv(join(ROOT, '.env')), ...readEnv(join(ROOT, '.env.local-admin')), ...process.env } as Record<string, string>;
// DB nền tảng riêng của test (DC-358) — `pnpm --filter @appchat/db db:test-reset` dựng / dọn.
export const env = { ...raw, ...testDbEnv(raw) };

for (const k of ['PG_ADMIN_URL', 'PLATFORM_DATABASE_URL', 'TENANT_DATABASE_URL', 'PROVISIONER_DATABASE_URL', 'MIGRATOR_DATABASE_URL']) {
  if (!env[k]) throw new Error(`Integration cần ${k} — chạy \`pnpm --filter @appchat/db db:setup\` trước`);
}

/** uuid workspace ngẫu nhiên cho test (12 ký tự cuối khác nhau → DB riêng). */
export const newWorkspaceId = () => randomUUID();

export async function adminQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  const c = new pg.Client({ connectionString: env.PG_ADMIN_URL });
  await c.connect();
  try {
    return await c.query<T>(sql, params);
  } finally {
    await c.end();
  }
}

export async function dbExists(name: string): Promise<boolean> {
  return ((await adminQuery('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount ?? 0) > 0;
}
