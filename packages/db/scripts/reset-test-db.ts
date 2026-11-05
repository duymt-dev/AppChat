// pnpm --filter @appchat/db db:test-reset — dựng lại sạch DB nền tảng test (DC-358): DROP mọi DB tenant mà platform test ghi nhận, DROP
// `appchat_platform_test`, rồi dựng lại bằng `setupCluster` (migration platform + template, cùng role / mật khẩu của `.env`). Chạy lần đầu
// để tạo, và ở đầu cổng chốt mỗi TIP / khi workspace test tồn nhiều. Không bao giờ đụng DB nền tảng demo (chốt chặn trong `testDbEnv`).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { TenantProvisioner, quoteIdent, setupCluster, testDbEnv, withDatabase } from '../src';

if (process.env.NODE_ENV === 'production') throw new Error('Không reset ở production');
const ROOT = join(import.meta.dirname, '..', '..', '..');
const readEnv = (f: string): Record<string, string> =>
  existsSync(f)
    ? Object.fromEntries(
        readFileSync(f, 'utf8')
          .split(/\r?\n/)
          .filter((l) => /^[A-Z_]+=/.test(l))
          .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
      )
    : {};
const env = { ...readEnv(join(ROOT, '.env')), ...process.env } as Record<string, string>;
const admin = readEnv(join(ROOT, '.env.local-admin')).PG_ADMIN_URL ?? process.env.PG_ADMIN_URL;
if (!admin) throw new Error('Thiếu PG_ADMIN_URL (.env.local-admin)');
for (const k of ['PG_PW_PLATFORM_APP', 'PG_PW_TENANT_APP', 'PG_PW_PROVISIONER', 'PG_PW_MIGRATOR', 'PROVISIONER_DATABASE_URL'])
  if (!env[k]) throw new Error(`Thiếu ${k} — chạy \`pnpm --filter @appchat/db db:setup\` trước`);

const t = testDbEnv(env);
const name = t.TEST_PLATFORM_DB!;
const templateDb = env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template';
const say = (s: string) => process.stdout.write(`${s}\n`);
const q = async <T extends pg.QueryResultRow>(url: string, sql: string, params: unknown[] = []) => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return (await c.query<T>(sql, params)).rows;
  } finally {
    await c.end();
  }
};

const exists = (await q(admin, 'SELECT 1 FROM pg_database WHERE datname = $1', [name])).length > 0;
let dropped = 0;
if (exists) {
  const ws = await q<{ db_name: string }>(withDatabase(admin, name), 'SELECT db_name FROM workspace').catch(() => []);
  const prov = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb, ownerRole: 'appchat_migrator' });
  for (const w of ws) {
    await prov.drop(w.db_name);
    dropped++;
  }
  await q(admin, `DROP DATABASE ${quoteIdent(name)} WITH (FORCE)`);
}
const r = await setupCluster({
  adminUrl: admin,
  platformDb: name,
  templateDb,
  passwords: { platform_app: env.PG_PW_PLATFORM_APP!, tenant_app: env.PG_PW_TENANT_APP!, provisioner: env.PG_PW_PROVISIONER!, migrator: env.PG_PW_MIGRATOR! },
});
say(`db:test-reset xong — ${name}: drop ${dropped} DB tenant test, platform ${r.platform.length} migration, template +${r.template.length}`);
