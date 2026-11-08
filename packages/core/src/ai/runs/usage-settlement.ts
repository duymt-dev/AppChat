// Quyết toán usage hai DB (TIP-019b §2.3–2.5). Thứ tự: (1) tenant — khoá nhóm, cộng chi phí thô đã biết, định số trừ = ceil(tổng) − đã
// trừ, ghi lượt quyết toán `intent` (thứ tự duy nhất, ref sổ cố định); (2) nền tảng — trừ ví theo ref (gọi lại trả đúng số đã trừ lần
// đầu); (3) tenant — MỘT transaction: lượt `settled`, nhóm `charged`, bước llm (một dòng / nhóm), credit của run + subtree mọi tổ tiên +
// gốc, biên nhận `settled`. Lặp lại ở bất kỳ bước nào không trừ / cộng thêm. Ví không đủ → lượt `denied`, ghi `unbilled`, CREDIT_EXHAUSTED.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { UsageWallet } from '../../billing/services/usage-receipt';
import { uuidv7 } from '../../kernel/ids';
import type { TenantTx } from '../../kernel/actions/action-context';
import { appendRunEvent } from './run-events';

type Db = Pick<TenantDb, '$transaction' | 'aiUsageSettlement' | 'aiUsageReceipt'>;

export interface SettleOutcome {
  /** Credit trừ ở lượt này (0 khi nhóm đã đủ / làm tròn chưa sang đơn vị mới). */
  credits: number;
  /** Tổng đã trừ của nhóm sau lượt này. */
  groupCharged: number;
  denied: boolean;
}

type Intent = { groupId: string; ordinal: number; delta: number; ledgerRef: string; runId: string; rootRunId: string; logicalStep: number; kind: string; status: string; applied: number | null };

/** Ref sổ: chat giữ `<run>:<bước>` (đối soát 045b); embedding truy vấn / nạp kho có tiền tố loại — không đụng ref chat cùng bước. */
const refOf = (runId: string, kind: string, step: number, ordinal: number) => `${runId}:${kind === 'chat' ? '' : `${kind}:`}${step}${ordinal ? `:s${ordinal}` : ''}`;

/** (1) Định số + ghi `intent` (hoặc trả lượt chưa xong của biên nhận này khi chạy lại). */
async function intentFor(db: Db, receiptId: string, now: Date): Promise<Intent | null> {
  return db.$transaction(async (tx) => {
    const r = await tx.aiUsageReceipt.findUnique({ where: { id: receiptId }, select: { groupId: true, runId: true, rootRunId: true, logicalStep: true, status: true } });
    if (!r) return null;
    const existing = await tx.aiUsageSettlement.findFirst({ where: { receiptId }, orderBy: { ordinal: 'desc' } });
    const [kg] = await tx.$queryRaw<{ kind: string }[]>`SELECT kind FROM ai_usage_group WHERE id = ${r.groupId}`;
    const kind = kg?.kind ?? 'chat';
    if (existing) return { ...existing, runId: r.runId, rootRunId: r.rootRunId, logicalStep: r.logicalStep, kind };
    if (r.status !== 'usage_known') return null;
    const [g] = await tx.$queryRaw<{ charged: number; next_ordinal: number; denied: boolean }[]>`SELECT charged, next_ordinal, denied FROM ai_usage_group WHERE id = ${r.groupId} FOR UPDATE`;
    if (!g) return null;
    // Chi phí thô luỹ kế (numeric, không làm tròn) ghi lên nhóm; số trừ = ceil(tổng) − đã trừ của nhóm.
    const [sum] = await tx.$queryRaw<{ raw: string; total: string }[]>`
      UPDATE ai_usage_group SET raw_cost = s.raw FROM (SELECT COALESCE(SUM(raw_cost), 0) AS raw FROM ai_usage_receipt
        WHERE group_id = ${r.groupId} AND status IN ('usage_known', 'settled', 'denied') AND raw_cost IS NOT NULL) s
      WHERE id = ${r.groupId} RETURNING s.raw::text AS raw, CEIL(s.raw)::text AS total`;
    const delta = Math.max(0, Number(sum?.total ?? 0) - g.charged);
    const ordinal = g.next_ordinal;
    const ledgerRef = refOf(r.runId, kind, r.logicalStep, ordinal);
    await tx.aiUsageSettlement.create({ data: { groupId: r.groupId, ordinal, receiptId, delta, ledgerRef, createdAt: now } });
    await tx.$executeRaw`UPDATE ai_usage_group SET next_ordinal = next_ordinal + 1 WHERE id = ${r.groupId}`;
    return { groupId: r.groupId, ordinal, delta, ledgerRef, runId: r.runId, rootRunId: r.rootRunId, logicalStep: r.logicalStep, kind, status: 'intent', applied: null };
  });
}

/** Cộng credit vào run + mọi tổ tiên (subtree) + gốc — trong tx, một lần cho mỗi lượt quyết toán. */
async function addToTree(tx: TenantTx, runId: string, rootRunId: string, credits: number, observed: number, unbilled: number, now: Date) {
  if (credits > 0) {
    await tx.$executeRaw`UPDATE ai_run SET credits_used = credits_used + ${credits} WHERE id = ${runId}::uuid`;
    await tx.$executeRaw`
      WITH RECURSIVE up AS (SELECT id, parent_run_id FROM ai_run WHERE id = ${runId}::uuid
        UNION ALL SELECT r.id, r.parent_run_id FROM ai_run r JOIN up ON r.id = up.parent_run_id)
      UPDATE ai_run SET subtree_credits = subtree_credits + ${credits} WHERE id IN (SELECT id FROM up)`;
  }
  if (credits > 0 || observed > 0 || unbilled > 0)
    await tx.$executeRaw`UPDATE ai_root_budget SET charged = charged + ${credits}, observed = observed + ${observed}, unbilled = unbilled + ${unbilled}, updated_at = ${now} WHERE root_run_id = ${rootRunId}::uuid`;
}

export interface SettleDeps {
  db: Db;
  wallet: UsageWallet | null;
  workspaceId: string;
  now: () => Date;
}

/** Quyết toán biên nhận `usage_known`. Gọi lại an toàn (khôi phục dùng cùng hàm). */
export async function settleReceipt(d: SettleDeps, receiptId: string, meta: { source: string }): Promise<SettleOutcome> {
  const it = await intentFor(d.db, receiptId, d.now());
  if (!it) return { credits: 0, groupCharged: 0, denied: false };
  if (it.status === 'settled') return { credits: it.applied ?? 0, groupCharged: 0, denied: false };
  if (it.status === 'denied') throw new AppError('CREDIT_EXHAUSTED', 402);
  const rc = await d.db.aiUsageReceipt.findUniqueOrThrow({ where: { id: receiptId }, select: { provider: true, model: true, tokensIn: true, tokensOut: true, latencyMs: true } });
  let applied = 0;
  let ledgerId: string | null = null;
  if (it.delta > 0 && d.wallet) {
    try {
      const c = await d.wallet.charge({ workspaceId: d.workspaceId, ref: it.ledgerRef, credits: it.delta, runId: it.runId, provider: rc.provider, model: rc.model, tokensIn: rc.tokensIn, tokensOut: rc.tokensOut, source: meta.source });
      applied = c.amount;
      ledgerId = c.ledgerId;
    } catch (err) {
      // Từ chối dứt khoát (ví không đủ) → lượt `denied`, ghi usage đã thấy nhưng chưa thu; lỗi khác (mạng) giữ `intent` cho khôi phục.
      if ((err as AppError)?.code !== 'CREDIT_EXHAUSTED') throw err;
      await d.db.$transaction(async (tx) => {
        const n = await tx.aiUsageSettlement.updateMany({ where: { groupId: it.groupId, ordinal: it.ordinal, status: 'intent' }, data: { status: 'denied', applied: 0, settledAt: d.now() } });
        if (n.count !== 1) return;
        await tx.$executeRaw`UPDATE ai_usage_group SET denied = true WHERE id = ${it.groupId}`;
        await tx.aiUsageReceipt.updateMany({ where: { id: receiptId }, data: { status: 'denied', updatedAt: d.now() } });
        await addToTree(tx, it.runId, it.rootRunId, 0, it.delta, it.delta, d.now());
      });
      throw err;
    }
  }
  return d.db.$transaction(async (tx) => {
    const n = await tx.aiUsageSettlement.updateMany({ where: { groupId: it.groupId, ordinal: it.ordinal, status: 'intent' }, data: { status: 'settled', applied, ledgerId, settledAt: d.now() } });
    if (n.count !== 1) return { credits: applied, groupCharged: 0, denied: false };
    const [g] = await tx.$queryRaw<{ charged: number; step_id: string | null; raw: string | null }[]>`UPDATE ai_usage_group SET charged = charged + ${applied} WHERE id = ${it.groupId} RETURNING charged, step_id, raw_cost::text AS raw`;
    const idx = await upsertLlmStep(tx, it, g?.step_id ?? null, rc, g?.charged ?? applied, g?.raw ?? null, d.now());
    // Bước llm mới → sự kiện run đã commit cùng transaction (TIP-019b §5.3); cộng dồn vào bước sẵn có thì không phát lại.
    if (idx !== null) await appendRunEvent(tx, d.workspaceId, { runId: it.runId, kind: 'step', status: 'ok', stepIdx: idx }, d.now());
    await tx.aiUsageReceipt.updateMany({ where: { id: receiptId }, data: { status: 'settled', updatedAt: d.now() } });
    await addToTree(tx, it.runId, it.rootRunId, applied, applied, 0, d.now());
    return { credits: applied, groupCharged: g?.charged ?? applied, denied: false };
  });
}

/**
 * Một dòng `ai_run_step(llm)` mỗi nhóm (chat giữ `meta.llm_step` cho đối soát ví 045b; embedding ghi `usage_kind`); credit = tổng đã trừ của
 * nhóm; `meta.provider_cost` = chi phí thô luỹ kế của nhóm theo giá đã chụp (Blueprint §5.1 — chuỗi thập phân, không làm tròn).
 */
async function upsertLlmStep(tx: TenantTx, it: Intent, stepId: string | null, rc: { provider: string; model: string; tokensIn: number; tokensOut: number; latencyMs: number }, charged: number, raw: string | null, now: Date): Promise<number | null> {
  const meta = { ...(it.kind === 'chat' ? { llm_step: it.logicalStep } : { usage_kind: it.kind, logical_step: it.logicalStep }), ...(raw !== null ? { provider_cost: raw } : {}) };
  if (stepId) {
    await tx.aiRunStep.update({ where: { id: stepId }, data: { credits: charged, provider: rc.provider, model: rc.model, tokensIn: { increment: rc.tokensIn }, tokensOut: { increment: rc.tokensOut }, meta } });
    return null;
  }
  const [last] = await tx.$queryRaw<{ idx: number | null }[]>`SELECT MAX(idx) AS idx FROM ai_run_step WHERE run_id = ${it.runId}::uuid`;
  const id = uuidv7(now.getTime());
  const idx = (last?.idx ?? -1) + 1;
  await tx.aiRunStep.create({ data: { id, runId: it.runId, idx, type: 'llm', status: 'ok', provider: rc.provider, model: rc.model, tokensIn: rc.tokensIn, tokensOut: rc.tokensOut, credits: charged, latencyMs: rc.latencyMs, meta, createdAt: now } });
  await tx.$executeRaw`UPDATE ai_usage_group SET step_id = ${id}::uuid WHERE id = ${it.groupId}`;
  return idx;
}
