// tenant.provision / drop (Blueprint §2.0 vòng đời): CREATE DATABASE ws_x TEMPLATE appchat_tenant_template.
// Chạy bằng role appchat_provisioner (CREATEDB). Idempotent: DB đã có → bỏ qua. Lỗi giữa chừng → dọn DB dở.
import pg from 'pg';
import { withDatabase } from './env';
import { assertTenantDbName, quoteIdent, tenantDbName } from './db-name';

export interface ProvisionerOptions {
  /** URL appchat_provisioner (DB bất kỳ, thường `postgres`). */
  adminUrl: string;
  templateDb: string;
  /** Role DML của app được cấp CONNECT + quyền bảng. */
  appRole?: string;
  /** Owner DB mới (migrator — owner schema). */
  ownerRole?: string;
}

export interface ProvisionResult {
  dbName: string;
  created: boolean;
  ms: number;
}

export class TenantProvisioner {
  constructor(private readonly opts: ProvisionerOptions) {}

  async provision(workspaceId: string): Promise<ProvisionResult> {
    const started = Date.now();
    const dbName = assertTenantDbName(tenantDbName(workspaceId));
    const admin = new pg.Client({ connectionString: this.opts.adminUrl });
    await admin.connect();
    try {
      const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (exists.rowCount) return { dbName, created: false, ms: Date.now() - started };
      const owner = this.opts.ownerRole ? ` OWNER ${quoteIdent(this.opts.ownerRole)}` : '';
      await admin.query(`CREATE DATABASE ${quoteIdent(dbName)} TEMPLATE ${quoteIdent(this.opts.templateDb)}${owner}`);
      try {
        if (this.opts.appRole) await this.grant(dbName, this.opts.appRole, admin);
      } catch (e) {
        await admin.query(`DROP DATABASE IF EXISTS ${quoteIdent(dbName)} WITH (FORCE)`);
        throw e;
      }
      return { dbName, created: true, ms: Date.now() - started };
    } finally {
      await admin.end();
    }
  }

  /** Xoá DB tenant (workspace.delete sau khi đã pg_dump — TIP-041; test). */
  async drop(dbName: string): Promise<void> {
    const admin = new pg.Client({ connectionString: this.opts.adminUrl });
    await admin.connect();
    try {
      await admin.query(`DROP DATABASE IF EXISTS ${quoteIdent(assertTenantDbName(dbName))} WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }

  private async grant(dbName: string, role: string, admin: pg.Client): Promise<void> {
    const r = quoteIdent(role);
    await admin.query(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteIdent(dbName)} TO ${r}`);
    const db = new pg.Client({ connectionString: withDatabase(this.opts.adminUrl, dbName) });
    await db.connect();
    try {
      await db.query(`GRANT USAGE ON SCHEMA public TO ${r};
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${r};
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${r};`);
    } finally {
      await db.end();
    }
  }
}
