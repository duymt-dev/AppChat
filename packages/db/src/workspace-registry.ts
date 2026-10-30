// Adapter Prisma của port WorkspaceRegistry (DC-008) — đọc / ghi cột db_* của bảng `workspace` (platform/identity.prisma, TIP-004).
import type { PlatformDb } from './clients';
import type { DbStatus, WorkspaceDbInfo, WorkspaceRegistry } from './registry';

const SELECT = { id: true, dbName: true, dbHost: true, dbStatus: true, schemaVersion: true } as const;
type Row = { id: string; dbName: string; dbHost: string | null; dbStatus: DbStatus; schemaVersion: string | null };
const toInfo = (r: Row): WorkspaceDbInfo => ({ workspaceId: r.id, dbName: r.dbName, dbHost: r.dbHost, dbStatus: r.dbStatus, schemaVersion: r.schemaVersion });

export class PrismaWorkspaceRegistry implements WorkspaceRegistry {
  constructor(private readonly db: PlatformDb) {}

  async find(workspaceId: string): Promise<WorkspaceDbInfo | null> {
    const r = await this.db.workspace.findUnique({ where: { id: workspaceId }, select: SELECT });
    return r ? toInfo(r) : null;
  }

  async listMigratable(): Promise<WorkspaceDbInfo[]> {
    const rows = await this.db.workspace.findMany({ where: { dbStatus: { in: ['active', 'suspended'] } }, select: SELECT, orderBy: { id: 'asc' } });
    return rows.map(toInfo);
  }

  async setStatus(workspaceId: string, status: DbStatus, patch: Partial<Pick<WorkspaceDbInfo, 'dbName' | 'schemaVersion'>> = {}): Promise<void> {
    await this.db.workspace.update({
      where: { id: workspaceId },
      data: {
        dbStatus: status,
        ...(patch.dbName ? { dbName: patch.dbName } : {}),
        ...(patch.schemaVersion !== undefined ? { schemaVersion: patch.schemaVersion } : {}),
        ...(status === 'active' ? { provisionedAt: new Date() } : {}),
      },
    });
  }
}
