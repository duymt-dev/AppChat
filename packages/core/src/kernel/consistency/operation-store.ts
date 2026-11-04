// Sổ thao tác xuyên DB ở DB nền tảng (TIP-045b annex A1): `action_operation` khoá unique(workspace, actor_key, idempotency_key), pha
// prepared → platform_applied → tenant_applied → complete (failed / compensation_required tường minh). Ghi pha có điều kiện trên pha
// trước + fence — hai tiến trình khôi phục / một request chạy lại không đè nhau. Không lưu bí mật thô (input đã che trước khi vào đây).
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { PlatformTx } from '../actions/action-context';

export type OperationPhase = 'prepared' | 'platform_applied' | 'tenant_applied' | 'complete' | 'failed' | 'compensation_required';

/** Ngữ cảnh đủ để khôi phục pha tenant ở tiến trình khác (không có quyền / bí mật — authz dựng lại từ membership hiện tại). */
export interface OperationContext {
  source: string;
  actor: { type: string; id: string };
  onBehalfOfUserId?: string;
  runId?: string;
  approvalId?: string;
  /** hashInput(input) lúc request — pha tenant tiêu thụ duyệt so với hash này (input thô không lưu ở sổ). */
  approvalInputHash?: string;
  risk: string;
  undoUntil?: string;
  /** Mốc thời gian lệnh (action_log.created_at) — khôi phục giữ đúng mốc. */
  at: string;
}

export interface OperationRow {
  id: string;
  workspaceId: string;
  actionId: string;
  inputHash: string;
  phase: OperationPhase;
  context: OperationContext;
  logInput: unknown;
  plan: Record<string, unknown> | null;
  result: unknown;
  error: unknown;
  actionLogId: string;
  fence: number;
  traceId: string | null;
}

type Db = Pick<PlatformDb, 'actionOperation'> | PlatformTx;

export const actorKeyOf = (a: { type: string; id: string }) => `${a.type}:${a.id}`;
const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))) as object));

const toRow = (r: NonNullable<Awaited<ReturnType<PlatformDb['actionOperation']['findUnique']>>>): OperationRow => ({
  id: r.id,
  workspaceId: r.workspaceId,
  actionId: r.actionId,
  inputHash: r.inputHash,
  phase: r.phase as OperationPhase,
  context: r.context as unknown as OperationContext,
  logInput: r.logInput,
  plan: (r.plan as Record<string, unknown> | null) ?? null,
  result: r.result,
  error: r.error,
  actionLogId: r.actionLogId,
  fence: r.fence,
  traceId: r.traceId,
});

export class OperationStore {
  constructor(private readonly db: PlatformDb) {}

  async findByKey(ws: string, actorKey: string, key: string): Promise<OperationRow | null> {
    const r = await this.db.actionOperation.findUnique({ where: { workspaceId_actorKey_idempotencyKey: { workspaceId: ws, actorKey, idempotencyKey: key } } });
    return r ? toRow(r) : null;
  }

  async get(id: string, db: Db = this.db): Promise<OperationRow | null> {
    const r = await db.actionOperation.findUnique({ where: { id } });
    return r ? toRow(r) : null;
  }

  /** Khoá dòng trong transaction nền tảng (FOR UPDATE) — pha nền tảng chỉ chạy khi còn `prepared`. */
  async lock(ptx: PlatformTx, id: string): Promise<OperationRow | null> {
    await ptx.$queryRaw`SELECT id FROM action_operation WHERE id = ${id}::uuid FOR UPDATE`;
    return this.get(id, ptx);
  }

  /**
   * Tạo dòng `prepared` (ngoài transaction nghiệp vụ). Khoá đã có: cùng action + hash → trả dòng cũ (gửi lại); khác → 409 mismatch.
   */
  async open(d: {
    id: string;
    workspaceId: string;
    actorKey: string;
    idempotencyKey: string;
    actionId: string;
    inputHash: string;
    context: OperationContext;
    logInput: unknown;
    actionLogId: string;
    traceId?: string;
    now: Date;
  }): Promise<{ row: OperationRow; created: boolean }> {
    const prev = await this.findByKey(d.workspaceId, d.actorKey, d.idempotencyKey);
    if (prev) return { row: this.same(prev, d.actionId, d.inputHash), created: false };
    try {
      const r = await this.db.actionOperation.create({
        data: {
          id: d.id,
          workspaceId: d.workspaceId,
          actorKey: d.actorKey,
          idempotencyKey: d.idempotencyKey,
          actionId: d.actionId,
          inputHash: d.inputHash,
          context: json(d.context)!,
          logInput: json(d.logInput) ?? {},
          actionLogId: d.actionLogId,
          approvalId: d.context.approvalId ?? null,
          runId: d.context.runId ?? null,
          traceId: d.traceId ?? null,
          createdAt: d.now,
          updatedAt: d.now,
        },
      });
      return { row: toRow(r), created: true };
    } catch (e) {
      // Hai request cùng khoá song song: bên thua đọc lại dòng bên thắng.
      if ((e as { code?: string }).code !== 'P2002') throw e;
      const again = await this.findByKey(d.workspaceId, d.actorKey, d.idempotencyKey);
      if (!again) throw e;
      return { row: this.same(again, d.actionId, d.inputHash), created: false };
    }
  }

  private same(r: OperationRow, actionId: string, hash: string): OperationRow {
    if (r.actionId !== actionId || r.inputHash !== hash) throw new AppError('CONFLICT', 409, { idempotency_key: 'mismatch' });
    return r;
  }

  /** Chuyển pha có điều kiện (pha trước + fence); false = tiến trình khác đã chuyển. */
  async advance(
    db: Db,
    id: string,
    from: OperationPhase,
    to: OperationPhase,
    now: Date,
    data: { plan?: unknown; result?: unknown; error?: unknown; fence?: number; nextAttemptAt?: Date | null } = {},
  ): Promise<boolean> {
    const r = await db.actionOperation.updateMany({
      where: { id, phase: from, ...(data.fence !== undefined ? { fence: data.fence } : {}) },
      data: {
        phase: to,
        updatedAt: now,
        ...(data.plan !== undefined ? { plan: json(data.plan) } : {}),
        ...(data.result !== undefined ? { result: json(data.result) } : {}),
        ...(data.error !== undefined ? { error: json(data.error) } : {}),
        // Pha xong (complete / failed) không còn trong hàng khôi phục; pha trung gian được hẹn lại ngay (request đang chạy tiếp).
        nextAttemptAt: data.nextAttemptAt === undefined ? (to === 'complete' || to === 'failed' ? null : now) : data.nextAttemptAt,
      },
    });
    return r.count === 1;
  }

  /** Nhận việc khôi phục: tăng fence + lease; trả fence mới hoặc null nếu dòng đang có lease người khác / đã xong. */
  async claim(id: string, now: Date, leaseMs: number): Promise<number | null> {
    const rows = await this.db.$queryRaw<{ fence: number }[]>`
      UPDATE action_operation SET fence = fence + 1, attempts = attempts + 1, lease_until = ${new Date(now.getTime() + leaseMs)}, updated_at = ${now}
      WHERE id = ${id}::uuid AND phase IN ('prepared', 'platform_applied', 'tenant_applied') AND (lease_until IS NULL OR lease_until < ${now})
      RETURNING fence`;
    return rows[0]?.fence ?? null;
  }

  /** Hẹn thử lại (lỗi tạm) — backoff do người gọi tính. */
  async retryLater(id: string, fence: number, at: Date, error: unknown): Promise<void> {
    await this.db.actionOperation.updateMany({ where: { id, fence }, data: { nextAttemptAt: at, leaseUntil: null, error: json(error) } });
  }

  /** Thao tác chưa xong đến hạn khôi phục (index `action_operation_recovery_idx`). */
  async due(now: Date, limit: number): Promise<{ id: string; workspaceId: string; actionId: string }[]> {
    return this.db.actionOperation.findMany({
      where: { phase: { in: ['prepared', 'platform_applied', 'tenant_applied'] }, nextAttemptAt: { lte: now } },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }],
      take: limit,
      select: { id: true, workspaceId: true, actionId: true },
    });
  }
}
