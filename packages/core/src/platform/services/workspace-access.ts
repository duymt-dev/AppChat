// Cổng trạng thái vận hành workspace (TIP-040 pha 4, AC07, DC-373): tạm dừng chặn VIỆC MỚI ở mọi ranh giới, không chỉ lúc mở DB tenant.
//   - TenantDbResolver.get: db_status ≠ active → 423 (resolver bỏ cache khi thế hệ `workspace_status` đổi — ≤ 2 giây mọi tiến trình).
//   - Bước AI mới (AiRunner.beforeStep) và tin gửi ra (ChannelSenders, trước khi gọi kênh): client DB tenant đã mở KHÔNG phải giấy phép
//     vĩnh viễn — hỏi lại cổng này (cache ≤ 2 giây theo thế hệ). Đang tạm dừng → dừng run / hoãn tin (không gửi), không hứa thu hồi
//     tin / lời gọi đã gửi trước đó.
import type { PlatformDb } from '@appchat/db';
import { WORKSPACE_STATUS_SCOPE } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { RevisionWatch } from './config-revision';

export class WorkspaceSuspendedError extends AppError {
  constructor(readonly workspaceId: string) {
    super('WORKSPACE_UNAVAILABLE', 423, { workspace: 'suspended' });
  }
}

export class WorkspaceAccess {
  private readonly cache = new Map<string, { gen: bigint; at: number; open: boolean }>();
  private readonly watch: RevisionWatch;

  constructor(
    private readonly db: Pick<PlatformDb, 'workspace' | 'platformConfigRevision'>,
    private readonly now: () => number = Date.now,
  ) {
    this.watch = new RevisionWatch(db, WORKSPACE_STATUS_SCOPE, now);
  }

  /** true = workspace đang hoạt động (status active + db_status active). */
  async isOpen(workspaceId: string): Promise<boolean> {
    const c = this.cache.get(workspaceId);
    if (c && this.now() - c.at < 60_000 && !(await this.watch.stale(c.gen))) return c.open;
    const gen = await this.watch.begin();
    const w = await this.db.workspace.findUnique({ where: { id: workspaceId }, select: { status: true, dbStatus: true } });
    const open = !!w && w.status === 'active' && w.dbStatus === 'active';
    this.cache.set(workspaceId, { gen, at: this.now(), open });
    return open;
  }

  async assertOpen(workspaceId: string): Promise<void> {
    if (!(await this.isOpen(workspaceId))) throw new WorkspaceSuspendedError(workspaceId);
  }
}
