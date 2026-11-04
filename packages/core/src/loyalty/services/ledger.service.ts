// Sổ điểm (TIP-036, COMMERCE §7, DC-297). Người gọi đã khoá dòng contact (`lockMember`) trong transaction; mọi ghi cập nhật cùng lúc
// sổ chỉ thêm + lô FIFO + `contact.points_balance`. Bất biến: points_balance = Σ remaining các lô − nợ (nợ = −số dư khi âm — DC-297 a).
// - Cộng (delta > 0): trả nợ trước, phần còn lại thành lô mới (hạn 12 tháng). `restore` cộng lại đúng lô đã trừ (giữ hạn gốc — DC-297 b).
// - Trừ (delta < 0): lấy FIFO (lô ưu tiên trước nếu có); thiếu → `allowDebt` (đảo điểm) ghi nợ, còn lại 422.
// `dedupe_key` duy nhất: ghi lặp (event / job chạy lại) trả bút toán cũ, không ghi hai lần.
import { AppError, expiryOf, safePoints } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { openLots } from '../repos/ledger.repo';

export type LedgerKind = 'earn' | 'redeem' | 'adjust' | 'expire' | 'reverse' | 'restore';
export interface Actor {
  type: string;
  id: string | null;
}

export interface PostIn {
  contactId: string;
  kind: LedgerKind;
  delta: bigint;
  balance: bigint;
  actor: Actor;
  now: Date;
  reason?: string;
  note?: string;
  ref?: { type: string; id: string };
  dedupeKey?: string;
  basis?: Record<string, unknown>;
  /** Trừ: lô lấy trước (vd. đảo điểm lấy từ lô của chính lần tích). */
  preferLot?: string;
  /** Trừ vượt số dư được phép (đảo điểm khi điểm đã tiêu — DC-297 a). */
  allowDebt?: boolean;
  /** Trừ đúng một lô (hết hạn). */
  onlyLot?: string;
  /** Cộng: số thành lô mới (mặc định delta − nợ); `restore` tự trả về lô gốc nên chỉ phần dư. */
  lotRemaining?: bigint;
}

export interface Posted {
  id: string;
  delta: bigint;
  balanceAfter: bigint;
  duplicate: boolean;
}

async function existing(tx: TenantTx, key: string | undefined): Promise<Posted | null> {
  if (!key) return null;
  const r = await tx.loyaltyLedger.findFirst({ where: { dedupeKey: key }, select: { id: true, delta: true, balanceAfter: true } });
  return r ? { id: r.id, delta: r.delta, balanceAfter: r.balanceAfter, duplicate: true } : null;
}

/** Ghi một bút toán. `balance` = số dư hiện tại (đọc dưới khoá). */
export async function post(tx: TenantTx, e: PostIn): Promise<Posted> {
  const dup = await existing(tx, e.dedupeKey);
  if (dup) return dup;
  if (e.delta === 0n) throw new AppError('VALIDATION_FAILED', 422, { delta: 'zero' });
  const id = uuidv7(e.now.getTime());
  const after = e.balance + e.delta;
  safePoints(after);
  const base = {
    id,
    contactId: e.contactId,
    kind: e.kind,
    delta: e.delta,
    balanceAfter: after,
    reason: e.reason ?? '',
    note: e.note ?? '',
    refType: e.ref?.type ?? null,
    refId: e.ref?.id ?? null,
    dedupeKey: e.dedupeKey ?? null,
    basis: (e.basis ?? undefined) as never,
    actorType: e.actor.type,
    actorId: e.actor.id,
    createdAt: e.now,
  };
  if (e.delta > 0n) {
    // Trả nợ trước (số dư âm), phần còn lại là lô mới.
    const debt = e.balance < 0n ? -e.balance : 0n;
    const lot = e.lotRemaining ?? (e.delta > debt ? e.delta - debt : 0n);
    await tx.loyaltyLedger.create({ data: { ...base, remaining: lot, expiresAt: lot > 0n ? expiryOf(e.now) : null } });
  } else {
    await tx.loyaltyLedger.create({ data: { ...base, remaining: null, expiresAt: null } });
    await allocate(tx, id, e);
  }
  await tx.contact.update({ where: { id: e.contactId }, data: { pointsBalance: after } });
  return { id, delta: e.delta, balanceAfter: after, duplicate: false };
}

/** Trừ FIFO cho bút toán `debitId`; thiếu điểm → nợ (allowDebt) hoặc 422. */
async function allocate(tx: TenantTx, debitId: string, e: PostIn) {
  let need = -e.delta;
  const lots = (await openLots(tx, e.contactId, e.kind === 'expire' ? new Date(0) : e.now)).filter((l) => !e.onlyLot || l.id === e.onlyLot);
  if (e.preferLot) lots.sort((a, b) => (a.id === e.preferLot ? -1 : b.id === e.preferLot ? 1 : 0));
  for (const l of lots) {
    if (need <= 0n) break;
    const take = l.remaining < need ? l.remaining : need;
    await tx.loyaltyLedger.update({ where: { id: l.id }, data: { remaining: l.remaining - take } });
    await tx.loyaltyAlloc.create({ data: { debitId, lotId: l.id, points: take } });
    need -= take;
  }
  if (need > 0n && !e.allowDebt) throw new AppError('VALIDATION_FAILED', 422, { points: 'insufficient', missing: String(need) });
}

/**
 * Trả lại điểm của một bút toán trừ (hoàn tác đổi điểm / điều chỉnh âm, huỷ đơn trả điểm đã dùng): cộng vào đúng lô đã lấy, giữ hạn gốc
 * (lô đã quá hạn → job hết hạn lấy lại — DC-297 b). Đang nợ → khoản trả lại trả nợ trước như mọi khoản cộng; phần trừ không từ lô nào
 * (nợ của bút toán gốc) thành lô mới. Ghi bút toán `restore` đúng một lần (`dedupe_key`).
 */
export async function restoreDebit(tx: TenantTx, debitId: string, balance: bigint, actor: Actor, now: Date, reason = ''): Promise<Posted | null> {
  const debit = await tx.loyaltyLedger.findUnique({ where: { id: debitId }, include: { debits: true } });
  if (!debit || debit.delta >= 0n) return null;
  const key = `restore:${debitId}`;
  const dup = await existing(tx, key);
  if (dup) return dup;
  const back = -debit.delta;
  let debt = balance < 0n ? -balance : 0n;
  let fromLots = 0n;
  for (const a of debit.debits) {
    const amt = a.points - a.restored;
    if (amt <= 0n) continue;
    fromLots += amt;
    const payDebt = debt < amt ? debt : amt;
    debt -= payDebt;
    await tx.loyaltyAlloc.update({ where: { debitId_lotId: { debitId, lotId: a.lotId } }, data: { restored: a.points } });
    if (amt > payDebt) await tx.loyaltyLedger.update({ where: { id: a.lotId }, data: { remaining: { increment: amt - payDebt } } });
  }
  const extra = back - fromLots;
  const extraLot = extra > debt ? extra - debt : 0n;
  const p = await post(tx, { contactId: debit.contactId, kind: 'restore', delta: back, balance, actor, now, reason, ref: { type: 'loyalty_ledger', id: debitId }, dedupeKey: key, lotRemaining: extraLot });
  await tx.loyaltyLedger.update({ where: { id: debitId }, data: { reversedById: p.id } });
  return p;
}
