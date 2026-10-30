// Port registry workspace (DC-008): resolver chỉ cần db_name / db_host / db_status. Bảng `workspace` thuộc TIP-004
// (platform/identity.prisma) — TIP-004 cài adapter Prisma; trước đó test + dev dùng MemoryWorkspaceRegistry.
export const DB_STATUSES = ['provisioning', 'active', 'suspended', 'archiving', 'archived', 'restoring', 'deleting'] as const;
export type DbStatus = (typeof DB_STATUSES)[number];

export interface WorkspaceDbInfo {
  workspaceId: string;
  dbName: string;
  /** null = cluster mặc định (TENANT_DB_HOST). */
  dbHost: string | null;
  dbStatus: DbStatus;
  schemaVersion: string | null;
}

export interface WorkspaceRegistry {
  find(workspaceId: string): Promise<WorkspaceDbInfo | null>;
  /** Workspace cần tenant-migrate (`active | suspended`). */
  listMigratable(): Promise<WorkspaceDbInfo[]>;
  setStatus(workspaceId: string, status: DbStatus, patch?: Partial<Pick<WorkspaceDbInfo, 'dbName' | 'schemaVersion'>>): Promise<void>;
}

export class MemoryWorkspaceRegistry implements WorkspaceRegistry {
  private readonly rows = new Map<string, WorkspaceDbInfo>();

  upsert(info: WorkspaceDbInfo): void {
    this.rows.set(info.workspaceId, { ...info });
  }

  async find(workspaceId: string): Promise<WorkspaceDbInfo | null> {
    const r = this.rows.get(workspaceId);
    return r ? { ...r } : null;
  }

  async listMigratable(): Promise<WorkspaceDbInfo[]> {
    return [...this.rows.values()].filter((r) => r.dbStatus === 'active' || r.dbStatus === 'suspended').map((r) => ({ ...r }));
  }

  async setStatus(workspaceId: string, status: DbStatus, patch: Partial<WorkspaceDbInfo> = {}): Promise<void> {
    const r = this.rows.get(workspaceId);
    if (r) this.rows.set(workspaceId, { ...r, ...patch, dbStatus: status });
  }
}
