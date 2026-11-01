// MigrationRecorder ghi bảng tenant_migration ở DB nền tảng (platform/ops.prisma).
import type { PlatformDb } from './clients';
import type { MigrationRecorder } from './tenant-migrate';

export class PlatformMigrationRecorder implements MigrationRecorder {
  constructor(
    private readonly db: PlatformDb,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async start(workspaceId: string, version: string): Promise<void> {
    await this.db.tenantMigration.upsert({
      where: { workspaceId_version: { workspaceId, version } },
      create: { workspaceId, version, status: 'running', startedAt: this.now() },
      update: { status: 'running', startedAt: this.now(), error: null, finishedAt: null },
    });
  }

  async finish(workspaceId: string, version: string, error?: string): Promise<void> {
    await this.db.tenantMigration.update({
      where: { workspaceId_version: { workspaceId, version } },
      data: { status: error ? 'failed' : 'done', error: error ?? null, finishedAt: this.now() },
    });
  }
}
