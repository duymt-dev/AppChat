// pnpm --filter @appchat/db db:setup — dựng role + appchat_platform + appchat_tenant_template trên máy dev (idempotent).
// Đọc PG_ADMIN_URL từ .env.local-admin ở gốc repo (DC-009); sinh mật khẩu 4 role một lần, ghi vào .env (gitignore).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROLES, setupCluster, withDatabase } from '../src';

const ROOT = join(import.meta.dirname, '..', '..', '..');

function readEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
}

const admin = readEnv(join(ROOT, '.env.local-admin')).PG_ADMIN_URL ?? process.env.PG_ADMIN_URL;
if (!admin) throw new Error('Thiếu PG_ADMIN_URL (.env.local-admin)');

const envFile = join(ROOT, '.env');
const env = readEnv(envFile);
const pw = (k: string) => env[k] ?? randomBytes(18).toString('base64url');
const passwords = {
  platform_app: pw('PG_PW_PLATFORM_APP'),
  tenant_app: pw('PG_PW_TENANT_APP'),
  provisioner: pw('PG_PW_PROVISIONER'),
  migrator: pw('PG_PW_MIGRATOR'),
};
const platformDb = process.env.PLATFORM_DB ?? 'appchat_platform';
const templateDb = process.env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template';

const url = (role: string, password: string, db: string) => {
  const u = new URL(withDatabase(admin, db));
  u.username = role;
  u.password = password;
  return u.toString();
};

const r = await setupCluster({ adminUrl: admin, platformDb, templateDb, passwords });

const next: Record<string, string> = {
  ...env,
  PG_PW_PLATFORM_APP: passwords.platform_app,
  PG_PW_TENANT_APP: passwords.tenant_app,
  PG_PW_PROVISIONER: passwords.provisioner,
  PG_PW_MIGRATOR: passwords.migrator,
  PLATFORM_DATABASE_URL: url(ROLES.platform_app, passwords.platform_app, platformDb),
  TENANT_DATABASE_URL: url(ROLES.tenant_app, passwords.tenant_app, 'postgres'),
  PROVISIONER_DATABASE_URL: url(ROLES.provisioner, passwords.provisioner, 'postgres'),
  MIGRATOR_DATABASE_URL: url(ROLES.migrator, passwords.migrator, platformDb),
  TENANT_TEMPLATE_DB: templateDb,
};
writeFileSync(envFile, Object.entries(next).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
process.stdout.write(`db:setup xong — platform +${r.platform.length} migration, template +${r.template.length} migration; .env đã cập nhật\n`);
