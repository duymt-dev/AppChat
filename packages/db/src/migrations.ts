// Đọc thư mục migration Prisma (`<ts>_<tip>_<desc>/migration.sql`) và áp lên một DB — dùng cho template + tenant-migrate.
// Bảng theo dõi `_appchat_migrations` riêng (không dùng `_prisma_migrations`) vì runner tự quản lý song song nhiều DB.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

export interface MigrationFile {
  name: string;
  sql: string;
}

export const TENANT_MIGRATIONS_DIR = join(import.meta.dirname, '..', 'prisma', 'tenant', 'migrations');
export const PLATFORM_MIGRATIONS_DIR = join(import.meta.dirname, '..', 'prisma', 'platform', 'migrations');
export const TENANT_BOOTSTRAP_SQL = join(import.meta.dirname, '..', 'prisma', 'tenant', 'bootstrap.sql');

export function readMigrations(dir: string): MigrationFile[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, 'migration.sql')))
    .map((d) => d.name)
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name, 'migration.sql'), 'utf8') }));
}

/** Version = tên migration cuối cùng. */
export const latestVersion = (files: MigrationFile[]) => files.at(-1)?.name ?? null;

const TRACK = `CREATE TABLE IF NOT EXISTS "_appchat_migrations" (
  "name" text PRIMARY KEY,
  "applied_at" timestamptz NOT NULL DEFAULT now()
)`;

/** Áp các migration chưa có, mỗi file một transaction. Trả danh sách đã áp. */
export async function applyMigrations(url: string, files: MigrationFile[]): Promise<string[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(TRACK);
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM "_appchat_migrations"')).rows.map((r) => r.name));
    const applied: string[] = [];
    for (const f of files) {
      if (done.has(f.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(f.sql);
        await client.query('INSERT INTO "_appchat_migrations"(name) VALUES ($1)', [f.name]);
        await client.query('COMMIT');
        applied.push(f.name);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f.name} lỗi: ${(e as Error).message}`, { cause: e });
      }
    }
    return applied;
  } finally {
    await client.end();
  }
}

export async function execSql(url: string, sql: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
