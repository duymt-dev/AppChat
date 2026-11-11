// Fence công bố đề xuất theo bản ghi (TIP-023g §3.6): mọi chuyển pha là UPDATE có điều kiện (id + pha + thế hệ kiểm) — huỷ / thu hồi /
// vô hiệu thắng tiến trình kiểm cũ (không đè pha cuối, không ABA). Chữ thô chỉ ở `private_generation` trong lúc chờ kiểm; công bố / thất
// bại / vô hiệu đều xoá nó. Không tính tiền ở đây (019b).
import { TenantSql } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { OPEN_PHASES, PROPOSAL_LEASE_MS } from './admission';

type Tx = Pick<TenantTx, 'recordProposal'>;
const lease = (now: Date) => new Date(now.getTime() + PROPOSAL_LEASE_MS);

/** Model đã trả — lưu riêng, sang `validating`, tăng thế hệ. Trả thế hệ mới hoặc null nếu mất CAS. */
export async function recordGeneration(tx: Tx, id: string, text: string, now: Date): Promise<number | null> {
  const r = await tx.recordProposal.updateMany({ where: { id, phase: 'awaiting_generation' }, data: { phase: 'validating', privateGeneration: text, validationGeneration: { increment: 1 }, leaseUntil: lease(now) } });
  if (!r.count) return null;
  return (await tx.recordProposal.findUnique({ where: { id }, select: { validationGeneration: true } }))?.validationGeneration ?? null;
}

/** Nhận lại lease kiểm (khôi phục / gửi lại) — chỉ khi đang `validating` đúng thế hệ và lease đã hết. */
export async function claimValidation(tx: Tx, id: string, generation: number, now: Date): Promise<boolean> {
  const r = await tx.recordProposal.updateMany({ where: { id, phase: 'validating', validationGeneration: generation, leaseUntil: { lt: now } }, data: { leaseUntil: lease(now) } });
  return r.count > 0;
}

/** Công bố đúng một lần: pha `validating` + đúng thế hệ đã đọc. Mất CAS → false. */
export async function publishProposal(tx: Tx, id: string, generation: number, result: object): Promise<boolean> {
  const r = await tx.recordProposal.updateMany({ where: { id, phase: 'validating', validationGeneration: generation }, data: { phase: 'validated', publishedResult: result, privateGeneration: null, safeReason: null } });
  return r.count > 0;
}

/** Khuôn sai / dừng cứng — pha cuối có mã an toàn, không chữ thô. */
export async function failProposal(tx: Tx, id: string, reason: string): Promise<void> {
  await tx.recordProposal.updateMany({ where: { id, phase: { in: [...OPEN_PHASES] } }, data: { phase: 'failed', privateGeneration: null, safeReason: reason.slice(0, 60) } });
}

/** Nguồn đổi / mất quyền / huỷ / Quên khách — vô hiệu cả bản đã công bố. */
export async function invalidateProposal(tx: Tx, id: string, reason: string): Promise<void> {
  await tx.recordProposal.updateMany({
    where: { id, phase: { in: [...OPEN_PHASES, 'validated'] } },
    data: { phase: 'invalidated', privateGeneration: null, publishedResult: TenantSql.DbNull, safeReason: reason.slice(0, 60) },
  });
}

export const PROPOSAL_RECOVERY_BATCH = 100;

/** Quét khôi phục (045b): sinh dở quá lease → thất bại USAGE_UNKNOWN (không gọi lại); chữ kiểm dở quá `abandonMs` → vô hiệu + xoá chữ. */
export async function recoverProposals(tx: Tx, now: Date, abandonMs: number): Promise<{ unknown: number; abandoned: number }> {
  const due = await tx.recordProposal.findMany({
    where: { phase: { in: [...OPEN_PHASES] }, leaseUntil: { lt: now } },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    take: PROPOSAL_RECOVERY_BATCH,
    select: { id: true, phase: true, updatedAt: true },
  });
  let unknown = 0;
  let abandoned = 0;
  for (const b of due) {
    if (b.phase === 'awaiting_generation') {
      await failProposal(tx, b.id, 'USAGE_UNKNOWN');
      unknown++;
    } else if (now.getTime() - b.updatedAt.getTime() > abandonMs) {
      await invalidateProposal(tx, b.id, 'abandoned');
      abandoned++;
    }
  }
  return { unknown, abandoned };
}
