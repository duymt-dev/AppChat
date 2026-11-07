// Workspace + membership (Blueprint §2.0, §4.2; REQ-A03, A04). Tạo workspace = ghi registry `provisioning` + owner,
// rồi job `tenant.provision` (queue `tenant`, worker ROLE=jobs) tạo DB riêng → `active`.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import { tenantDbName, type PlatformDb } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { TENANT_PROVISION_QUEUE } from './identity.tokens';

export interface ProvisionQueue {
  /** jobId = workspaceId → gọi lại không tạo job trùng. */
  enqueue(workspaceId: string): Promise<void>;
  /** Job đã hết lượt thử. */
  failed(workspaceId: string): Promise<boolean>;
}

export interface MembershipRow {
  workspaceId: string;
  roleKey: string;
  delegations: string[];
}

export type ProvisioningStatus = 'running' | 'ready' | 'failed';
type LifecycleState = 'archiving' | 'archived' | 'restoring' | 'deleting';
const LIFECYCLE_STATES: ReadonlySet<string> = new Set<LifecycleState>(['archiving', 'archived', 'restoring', 'deleting']);

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'workspace';

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(PLATFORM_DB) private readonly db: PlatformDb,
    @Inject(TENANT_PROVISION_QUEUE) private readonly queue: ProvisionQueue,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async create(userId: string, name: string, opts: { autoNamed?: boolean } = {}) {
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    const user = await this.db.user.findUniqueOrThrow({ where: { id: userId }, select: { locale: true } });
    const ws = await this.db.$transaction(async (tx) => {
      const w = await tx.workspace.create({
        data: {
          id,
          name,
          // slug duy nhất: phần đuôi lấy từ id (không đoán được, không trùng).
          slug: `${slugify(name)}-${id.slice(-6)}`,
          ownerUserId: userId,
          locale: user.locale,
          dbName: tenantDbName(id),
          dbStatus: 'provisioning',
          // Workspace tự tạo lúc đăng nhập lần đầu (TIP-011) — khai báo DN lần đầu đổi tên theo tên pháp lý.
          ...(opts.autoNamed ? { settings: { auto_named: true } } : {}),
        },
      });
      await tx.membership.create({ data: { workspaceId: id, userId, roleKey: 'owner', status: 'active', joinedAt: now } });
      await tx.user.update({ where: { id: userId }, data: { lastWorkspaceId: id } });
      return w;
    });
    await this.queue.enqueue(id);
    return { id: ws.id, name: ws.name, slug: ws.slug, db_status: ws.dbStatus };
  }

  /** Membership active của user tại workspace — nền của mọi request có X-Workspace-Id (Index Only Scan membership_user_active_idx). */
  async membership(userId: string, workspaceId: string): Promise<MembershipRow | null> {
    const m = await this.db.membership.findFirst({
      where: { userId, workspaceId, status: 'active' },
      select: { workspaceId: true, roleKey: true, delegations: true },
    });
    return m;
  }

  /** Chỉ thành viên mới xem được trạng thái khởi tạo. failed = job đã hết lượt thử (DC-021). */
  async provisioning(userId: string, workspaceId: string): Promise<ProvisioningStatus> {
    if (!(await this.membership(userId, workspaceId))) throw new AppError('FORBIDDEN', 403, { workspace: 'not_member' });
    const w = await this.db.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { dbStatus: true } });
    if (w.dbStatus === 'active') return 'ready';
    if (w.dbStatus === 'provisioning') return (await this.queue.failed(workspaceId)) ? 'failed' : 'running';
    return 'failed';
  }

  /** GET /v1/me: user + mọi workspace active (plan / trial do TIP-009 điền), workspace đang dùng, cờ cần khai báo. */
  async me(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('UNAUTHENTICATED', 401);
    const members = await this.db.membership.findMany({
      where: { userId, status: 'active' },
      select: { workspaceId: true, roleKey: true },
    });
    const ids = members.map((m) => m.workspaceId);
    const [workspaces, profiles] = await Promise.all([
      this.db.workspace.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, dbStatus: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
      this.db.businessProfile.findMany({ where: { workspaceId: { in: ids } }, select: { workspaceId: true } }),
    ]);
    const role = new Map(members.map((m) => [m.workspaceId, m.roleKey]));
    const declared = new Set(profiles.map((p) => p.workspaceId));
    const current = user.lastWorkspaceId && role.has(user.lastWorkspaceId) ? user.lastWorkspaceId : (workspaces[0]?.id ?? null);
    return {
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, avatar_url: user.avatarUrl, locale: user.locale },
      workspaces: workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        role: role.get(w.id)!,
        db_status: w.dbStatus,
        declared: declared.has(w.id),
        plan: null,
        trial_ends_at: null,
      })),
      current_workspace_id: current,
      needs_declare: !workspaces.some((w) => declared.has(w.id)),
    };
  }

  /**
   * Đăng ký / đăng nhập xong mà chưa thuộc workspace nào → tạo workspace đầu tiên (tên = phần trước @ của email) + job
   * `tenant.provision` (Auth flow Blueprint §8: tạo workspace trước khai báo). Đã có membership active → không làm gì.
   */
  async ensureFirst(userId: string, email: string): Promise<string | null> {
    if (await this.db.membership.findFirst({ where: { userId, status: 'active' }, select: { workspaceId: true } })) return null;
    return (await this.create(userId, email.split('@')[0]!.slice(0, 120) || 'Workspace', { autoNamed: true })).id;
  }

  /** Workspace đang dùng của user + trạng thái onboarding phía identity (GET /v1/session — TIP-011). */
  async onboarding(userId: string) {
    const me = await this.me(userId);
    const ws = me.workspaces.find((w) => w.id === me.current_workspace_id);
    if (!ws) return null;
    const m = await this.db.membership.findUnique({ where: { workspaceId_userId: { workspaceId: ws.id, userId } }, select: { noticesSeen: true } });
    const ready = ws.db_status === 'active';
    // TIP-041: đã lưu trữ / đang lưu trữ / đang khôi phục ≠ khởi tạo lỗi — FE hiện thẻ "Đang khôi phục" (workspace.open tạo lệnh).
    const lifecycle = LIFECYCLE_STATES.has(ws.db_status) ? (ws.db_status as LifecycleState) : null;
    return {
      workspaceId: ws.id,
      declared: ws.declared,
      dbReady: ready,
      lifecycle,
      failed: !ready && !lifecycle && (ws.db_status !== 'provisioning' || (await this.queue.failed(ws.id))),
      notices: m?.noticesSeen ?? [],
    };
  }

  /** Đã xem thông báo onboarding (`trial_welcome` / `trial_expired`) ở workspace đang dùng — idempotent. */
  async ackNotice(userId: string, notice: string): Promise<void> {
    const cur = await this.onboarding(userId);
    if (!cur || cur.notices.includes(notice)) return;
    await this.db.membership.update({
      where: { workspaceId_userId: { workspaceId: cur.workspaceId, userId } },
      data: { noticesSeen: { push: notice } },
    });
  }

  /** workspace.switch: đích phải là membership active. */
  async switchTo(userId: string, workspaceId: string, tx: Pick<PlatformDb, 'membership' | 'user'> = this.db): Promise<void> {
    const m = await tx.membership.findFirst({ where: { userId, workspaceId, status: 'active' }, select: { workspaceId: true } });
    if (!m) throw new AppError('FORBIDDEN', 403, { workspace_id: 'not_member' });
    await tx.user.update({ where: { id: userId }, data: { lastWorkspaceId: workspaceId } });
  }
}
