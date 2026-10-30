// Dựng cụm Postgres cho môi trường dev / test (idempotent): 4 role Blueprint §2.0 + DB nền tảng + template tenant.
// Prod do infra (TIP-045) làm cùng bước; hàm này dùng chung để script và test không lệch nhau.
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { withDatabase } from './env';
import { quoteIdent } from './db-name';
import {
  PLATFORM_MIGRATIONS_DIR,
  TENANT_BOOTSTRAP_SQL,
  TENANT_MIGRATIONS_DIR,
  applyMigrations,
  readMigrations,
} from './migrations';

export interface ClusterSetupOptions {
  /** Superuser (dev: appchat_dev_admin — DC-009). */
  adminUrl: string;
  platformDb: string;
  templateDb: string;
  /** Mật khẩu 4 role (dev / test). */
  passwords: Record<'platform_app' | 'tenant_app' | 'provisioner' | 'migrator', string>;
}

export const ROLES = {
  platform_app: 'appchat_platform_app',
  tenant_app: 'appchat_tenant_app',
  provisioner: 'appchat_provisioner',
  migrator: 'appchat_migrator',
} as const;

const ROLE_ATTRS: Record<keyof typeof ROLES, string> = {
  platform_app: 'LOGIN',
  tenant_app: 'LOGIN',
  provisioner: 'LOGIN CREATEDB',
  migrator: 'LOGIN',
};

async function withClient<T>(url: string, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function ensureRoles(admin: pg.Client, passwords: ClusterSetupOptions['passwords']): Promise<void> {
  for (const [k, role] of Object.entries(ROLES) as [keyof typeof ROLES, string][]) {
    const has = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
    const verb = has.rowCount ? 'ALTER' : 'CREATE';
    await admin.query(`${verb} ROLE ${quoteIdent(role)} WITH ${ROLE_ATTRS[k]} PASSWORD ${pg.escapeLiteral(passwords[k])}`);
  }
  // Provisioner tạo DB với OWNER migrator → phải là thành viên của migrator.
  await admin.query(`GRANT ${quoteIdent(ROLES.migrator)} TO ${quoteIdent(ROLES.provisioner)}`);
  // DROP DATABASE … WITH (FORCE) phải đuổi được kết nối còn sót của tenant_app (xoá workspace, test).
  await admin.query(`GRANT pg_signal_backend TO ${quoteIdent(ROLES.provisioner)}`);
}

async function ensureDb(admin: pg.Client, name: string, owner: string): Promise<boolean> {
  const has = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (has.rowCount) return false;
  await admin.query(`CREATE DATABASE ${quoteIdent(name)} OWNER ${quoteIdent(owner)} ENCODING 'UTF8' TEMPLATE template0`);
  return true;
}

export async function setupCluster(o: ClusterSetupOptions): Promise<{ platform: string[]; template: string[] }> {
  await withClient(o.adminUrl, async (admin) => {
    await ensureRoles(admin, o.passwords);
    await ensureDb(admin, o.platformDb, ROLES.migrator);
    await ensureDb(admin, o.templateDb, ROLES.migrator);
    // Template: cho phép CREATE DATABASE … TEMPLATE; không app nào kết nối.
    await admin.query(`UPDATE pg_database SET datistemplate = true WHERE datname = $1`, [o.templateDb]);
    await admin.query(`REVOKE CONNECT ON DATABASE ${quoteIdent(o.templateDb)} FROM PUBLIC`);
    await admin.query(`GRANT CONNECT ON DATABASE ${quoteIdent(o.platformDb)} TO ${quoteIdent(ROLES.platform_app)}`);
  });

  // Extension cần superuser (vector không trusted) → chạy bằng admin trên template.
  const templateAdmin = withDatabase(o.adminUrl, o.templateDb);
  await withClient(templateAdmin, (c) => c.query(readFileSync(TENANT_BOOTSTRAP_SQL, 'utf8')));

  const migrator = (db: string) => {
    const u = new URL(withDatabase(o.adminUrl, db));
    u.username = ROLES.migrator;
    u.password = o.passwords.migrator;
    return u.toString();
  };
  const platform = await applyMigrations(migrator(o.platformDb), readMigrations(PLATFORM_MIGRATIONS_DIR));
  const template = await applyMigrations(migrator(o.templateDb), readMigrations(TENANT_MIGRATIONS_DIR));

  await withClient(withDatabase(o.adminUrl, o.platformDb), (c) =>
    c.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(ROLES.platform_app)};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdent(ROLES.platform_app)};
      ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(ROLES.migrator)} IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdent(ROLES.platform_app)};`),
  );
  // Quyền mặc định trong template → mọi DB ws_* clone ra đều cấp sẵn cho tenant_app.
  await withClient(templateAdmin, (c) =>
    c.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(ROLES.migrator)} IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdent(ROLES.tenant_app)};
      ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(ROLES.migrator)} IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO ${quoteIdent(ROLES.tenant_app)};`),
  );
  return { platform, template };
}
