// Ghi kế hoạch nhập (TIP-038b, DC-374): dòng hợp lệ chia đơn vị ghi theo adapter (lô khách ≤ 500 · một chứng từ mỗi nhóm / dòng) → mỗi
// đơn vị MỘT lệnh action nghiệp vụ qua ActionExecutor (nguồn `system`, `onBehalfOfUserId` = người tạo, quyền HIỆN TẠI đọc lại mỗi vòng)
// với khoá idempotency `transfer:<plan>:<đơn vị>:<v>` — chạy lại / hai worker / bấm hai lần trả lại kết quả cũ, không ghi lần hai. Biên
// nhận = `transfer_row` cập nhật SAU khi action commit; sập giữa action và biên nhận → lần sau cùng khoá trả kết quả đã lưu rồi ghi biên
// nhận. Huỷ hợp tác ở ranh giới vòng (đơn vị đang chạy hoàn tất nguyên tử); phần đã ghi giữ nguyên, số đếm đúng thực tế. Dòng trùng /
// của người khác / lỗi (chính sách only_valid) → skipped, không gộp / không cập nhật bản ghi có sẵn. Sản phẩm: adapter `whole` (một
// `product.import` trên chính tệp — bộ kiểm 032b).
import type { TenantDb } from '@appchat/db';
import { AppError, transferSpec, type AuthzContext, type TransferTarget } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { adapterFor } from '../adapters';
import { planTarget } from '../services/dataset';
import type { Adapter, PendingRow, WriteUnit } from '../adapters/types';

export interface CommitDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  /** Quyền hiện tại của người tạo (null = không còn thành viên hoạt động). */
  authzOf: (ws: string, userId: string) => Promise<AuthzContext | null>;
  now: () => Date;
}

type Plan = {
  id: string;
  entity: string;
  dataset: string;
  datasetSchemaVersion: number;
  actorUserId: string;
  version: number;
  rowPolicy: string;
  fileId: string;
  mapping: unknown;
};
export type CommitOutcome = {
  status: 'completed' | 'cancelled' | 'failed';
  applied: number;
  skipped: number;
  failed: number;
  error?: string;
};

export const errCode = (e: unknown) => {
  const x = e as { code?: string; fields?: Record<string, unknown> };
  return (x.code ? `${x.code}${x.fields ? `:${Object.keys(x.fields).join(',')}` : ''}` : 'error').slice(
    0,
    200,
  );
};

/** Dòng không ghi (trùng / của người khác / lỗi khi chính sách only_valid) → skipped một lần (idempotent). */
async function skipNonValid(db: TenantDb, planId: string, now: Date) {
  await db.transferRow.updateMany({
    where: { planId, status: 'pending', check: { not: 'valid' } },
    data: { status: 'skipped', updatedAt: now },
  });
}

export async function tallyPlan(db: Pick<TenantDb, 'transferRow'>, planId: string) {
  const g = await db.transferRow.groupBy({ by: ['status'], where: { planId }, _count: { _all: true } });
  const n = (s: string) => g.find((x) => x.status === s)?._count._all ?? 0;
  return { applied: n('applied'), skipped: n('skipped'), failed: n('failed'), pending: n('pending') };
}

export const systemCtx = (
  ws: string,
  plan: Pick<Plan, 'id' | 'actorUserId' | 'version'>,
  authz: AuthzContext,
  key: string,
): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: 'data-transfer' },
  onBehalfOfUserId: plan.actorUserId,
  idempotencyKey: `transfer:${plan.id}:${key}:${plan.version}`,
  authz,
});

/** Một đơn vị qua action nghiệp vụ → biên nhận các dòng của nó trong MỘT transaction. */
async function applyUnit(
  db: TenantDb,
  ws: string,
  plan: Plan,
  target: TransferTarget,
  a: Adapter,
  authz: AuthzContext,
  unit: WriteUnit,
  d: CommitDeps,
) {
  const now = d.now();
  try {
    const out = await d.executor.execute(
      systemCtx(ws, plan, authz, unit.key),
      unit.action ?? transferSpec(target).writeAction!,
      unit.input,
    );
    if (out.status !== 200)
      throw new AppError('CONFLICT', 409, {
        status: String((out.data as { status?: string }).status ?? out.status),
      });
    const map = await a.resolve!(db, unit, out.data.result);
    await db.$transaction(async (tx) => {
      for (const r of unit.rows) {
        const hit = map.get(r.id);
        await tx.transferRow.updateMany({
          where: { id: r.id, status: 'pending' },
          data: hit
            ? { status: 'applied', resultId: hit.id, resultCode: hit.code, updatedAt: now }
            : { status: 'skipped', error: 'duplicate_at_commit', updatedAt: now },
        });
      }
    });
  } catch (e) {
    await db.transferRow.updateMany({
      where: { id: { in: unit.rows.map((r) => r.id) }, status: 'pending' },
      data: { status: 'failed', error: errCode(e), updatedAt: now },
    });
  }
}

/** Vòng kế: không nhóm → `batch` dòng đầu; có nhóm → `batch` nhóm đầu, đủ MỌI dòng chờ của các nhóm đó (nhóm không bị cắt). */
async function nextRows(db: TenantDb, planId: string, a: Adapter): Promise<PendingRow[]> {
  const sel = { id: true, rowNo: true, groupKey: true, data: true } as const;
  const where = { planId, status: 'pending' };
  if (!a.grouped)
    return (await db.transferRow.findMany({
      where,
      orderBy: { rowNo: 'asc' },
      take: a.batch,
      select: sel,
    })) as PendingRow[];
  const heads = await db.transferRow.findMany({
    where,
    orderBy: { rowNo: 'asc' },
    distinct: ['groupKey'],
    take: a.batch,
    select: { groupKey: true },
  });
  if (!heads.length) return [];
  return (await db.transferRow.findMany({
    where: { ...where, groupKey: { in: heads.map((h) => h.groupKey!) } },
    orderBy: { rowNo: 'asc' },
    select: sel,
  })) as PendingRow[];
}

/** Ghi hết dòng còn pending của kế hoạch. `shouldStop` = huỷ hợp tác (lease mất / người dùng huỷ). */
export async function commitPlan(
  db: TenantDb,
  ws: string,
  planId: string,
  d: CommitDeps,
  shouldStop: () => Promise<boolean> = async () => false,
): Promise<CommitOutcome> {
  const plan = await db.transferPlan.findUnique({ where: { id: planId } });
  if (!plan) return { status: 'failed', applied: 0, skipped: 0, failed: 0, error: 'not_found' };
  const now = () => d.now();
  await skipNonValid(db, planId, now());
  // Phân phối theo tập ĐÃ LƯU của kế hoạch (không theo payload việc nền); lược đồ tập đổi sau khi lập → dừng, không ghi theo luật mới.
  let target: TransferTarget;
  try {
    target = planTarget(plan);
  } catch {
    await db.transferRow.updateMany({ where: { planId, status: 'pending' }, data: { status: 'failed', error: 'dataset_schema_stale', updatedAt: now() } });
    const { applied, skipped, failed } = await tallyPlan(db, planId);
    const error = 'dataset_schema_stale';
    await db.transferPlan.update({ where: { id: planId }, data: { status: 'failed', applied, skipped, failed, error, finishedAt: now(), updatedAt: now() } });
    return { status: 'failed', applied, skipped, failed, error };
  }
  const a = adapterFor(target);
  let status: CommitOutcome['status'] = 'completed';
  let error: string | undefined;
  for (;;) {
    if (await shouldStop()) {
      status = 'cancelled';
      break;
    }
    const rows = await nextRows(db, planId, a);
    if (!rows.length) break;
    // Quyền hiện tại của người tạo mỗi vòng: bị gỡ / mất quyền nhập → dừng (không ghi thêm dưới quyền cũ).
    const authz = await d.authzOf(ws, plan.actorUserId);
    if (!authz) {
      status = 'failed';
      error = 'forbidden';
      break;
    }
    if (a.whole) {
      await a.whole({
        db,
        ws,
        plan,
        ctx: systemCtx(ws, plan, authz, 'whole'),
        executor: d.executor,
        shouldStop,
        now,
      });
      break;
    }
    for (const unit of a.units!(rows, { userId: plan.actorUserId }))
      await applyUnit(db, ws, plan, target, a, authz, unit, d);
  }
  if (status === 'failed')
    await db.transferRow.updateMany({
      where: { planId, status: 'pending' },
      data: { status: 'failed', error: error ?? 'error', updatedAt: now() },
    });
  const t = await tallyPlan(db, planId);
  if (status === 'completed' && t.pending) status = 'cancelled';
  await db.transferPlan.update({
    where: { id: planId },
    data: {
      status: status === 'completed' && t.failed && !t.applied ? 'failed' : status,
      applied: t.applied,
      skipped: t.skipped,
      failed: t.failed,
      error: error ?? null,
      finishedAt: now(),
      updatedAt: now(),
    },
  });
  return { status, applied: t.applied, skipped: t.skipped, failed: t.failed, ...(error ? { error } : {}) };
}
