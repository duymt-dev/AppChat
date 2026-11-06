// Ghi kế hoạch nhập (TIP-038b, DC-374): dòng hợp lệ chia lô theo adapter (contact.import ≤ 500) → mỗi lô MỘT lệnh action nghiệp vụ qua
// ActionExecutor (nguồn `system`, `onBehalfOfUserId` = người tạo, quyền HIỆN TẠI đọc lại mỗi lô) với khoá idempotency
// `transfer:<plan>:<lô>:<v>` — chạy lại / hai worker / bấm hai lần trả lại kết quả cũ, không ghi lần hai. Biên nhận = trạng thái
// `transfer_row` cập nhật SAU khi action commit; sập giữa action và biên nhận → lần sau cùng khoá trả kết quả đã lưu rồi ghi biên nhận.
// Huỷ hợp tác ở ranh giới lô (lô đang chạy hoàn tất nguyên tử); phần đã ghi giữ nguyên, số đếm đúng thực tế. Dòng trùng / của người khác
// / lỗi (chính sách only_valid) → skipped, không gộp / không cập nhật khách có sẵn.
import type { TenantDb } from '@appchat/db';
import {
  AppError,
  normalizePhone,
  transferSpec,
  type AuthzContext,
  type TransferEntity,
} from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { adapterFor } from '../adapters';

export interface CommitDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  /** Quyền hiện tại của người tạo (null = không còn thành viên hoạt động). */
  authzOf: (ws: string, userId: string) => Promise<AuthzContext | null>;
  now: () => Date;
}

type Plan = { id: string; entity: string; actorUserId: string; version: number; rowPolicy: string };
export type CommitOutcome = {
  status: 'completed' | 'cancelled' | 'failed';
  applied: number;
  skipped: number;
  failed: number;
  error?: string;
};

const errCode = (e: unknown) => {
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

/** Một lô qua action nghiệp vụ; dòng ↔ bản ghi tạo ra khớp theo SĐT / email chuẩn hoá (không theo vị trí). */
async function applyBatch(
  db: TenantDb,
  ws: string,
  plan: Plan,
  authz: AuthzContext,
  batch: { id: string; data: unknown }[],
  seq: number,
  d: CommitDeps,
) {
  const entity = plan.entity as TransferEntity;
  const a = adapterFor(entity);
  const ctx: ActionContext = {
    workspaceId: ws,
    source: 'system',
    actor: { type: 'system', id: 'data-transfer' },
    onBehalfOfUserId: plan.actorUserId,
    idempotencyKey: `transfer:${plan.id}:${seq}:${plan.version}`,
    authz,
  };
  const now = d.now();
  try {
    const out = await d.executor.execute<{ contact_ids?: string[]; created?: number }>(
      ctx,
      transferSpec(entity).writeAction,
      a.input(batch as { data: Record<string, string> }[]),
    );
    if (out.status !== 200)
      throw new AppError('CONFLICT', 409, {
        status: String((out.data as { status?: string }).status ?? out.status),
      });
    const byKey = await createdByKey(db, out.data.result.contact_ids ?? []);
    // Biên nhận cả lô trong MỘT transaction: sập giữa chừng → không biên nhận nào, lần sau cùng khoá idempotency trả kết quả đã lưu.
    await db.$transaction(async (tx) => {
      for (const r of batch) {
        const id =
          keysOf(r.data)
            .map((k) => byKey.get(k))
            .find(Boolean) ?? null;
        await tx.transferRow.updateMany({
          where: { id: r.id, status: 'pending' },
          data: id
            ? { status: 'applied', resultId: id, updatedAt: now }
            : { status: 'skipped', error: 'duplicate_at_commit', updatedAt: now },
        });
      }
    });
  } catch (e) {
    await db.transferRow.updateMany({
      where: { id: { in: batch.map((r) => r.id) }, status: 'pending' },
      data: { status: 'failed', error: errCode(e), updatedAt: now },
    });
  }
}

const keysOf = (data: unknown) => {
  const d = data as { phone?: string; email?: string };
  const p = normalizePhone(d.phone);
  return [p && `p:${p}`, d.email && `e:${d.email.toLowerCase()}`].filter((k): k is string => !!k);
};

/** Khách vừa tạo → khoá SĐT / email (dòng nào thành khách nào — trùng phát sinh lúc ghi thì dòng đó không có id). */
async function createdByKey(db: TenantDb, ids: string[]) {
  const m = new Map<string, string>();
  if (!ids.length) return m;
  for (const c of await db.contact.findMany({
    where: { id: { in: ids } },
    select: { id: true, phoneNorm: true, email: true },
  })) {
    if (c.phoneNorm) m.set(`p:${c.phoneNorm}`, c.id);
    if (c.email) m.set(`e:${c.email.toLowerCase()}`, c.id);
  }
  return m;
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
  const a = adapterFor(plan.entity as TransferEntity);
  let status: CommitOutcome['status'] = 'completed';
  let error: string | undefined;
  for (;;) {
    if (await shouldStop()) {
      status = 'cancelled';
      break;
    }
    const batch = await db.transferRow.findMany({
      where: { planId, status: 'pending' },
      orderBy: { rowNo: 'asc' },
      take: a.batch,
      select: { id: true, rowNo: true, data: true },
    });
    if (!batch.length) break;
    // Quyền hiện tại của người tạo mỗi lô: bị gỡ / mất quyền nhập → dừng (không ghi thêm dưới quyền cũ).
    const authz = await d.authzOf(ws, plan.actorUserId);
    if (!authz) {
      status = 'failed';
      error = 'forbidden';
      break;
    }
    await applyBatch(db, ws, plan, authz, batch, batch[0]!.rowNo, d);
  }
  if (status === 'failed')
    await db.transferRow.updateMany({
      where: { planId, status: 'pending' },
      data: { status: 'failed', error: error ?? 'error', updatedAt: now() },
    });
  const t = await tallyPlan(db, planId);
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
