// Biên nhận từng lần gọi model thật (TIP-019b §2.1–2.2): ghi TRƯỚC khi gửi (giá chụp lúc đó), khoá (nhóm, ứng viên, lô)
// duy nhất — chạy lại cùng lần gọi dùng lại dòng cũ, không gửi lại khi dòng đã có kết quả không rõ. Nhóm tính tiền `<run>:chat:<bước>`
// gom mọi ứng viên của bước; chi phí thô cộng đúng numeric, làm tròn một lần ở lượt quyết toán.
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';

type Db = Pick<TenantDb, 'aiUsageGroup' | 'aiUsageReceipt' | '$executeRaw'>;
/** `rerank` (TIP-020e): một lần gọi rerank đo được — migration `ai_usage_rerank_kind` mở CHECK. */
export type UsageKind = 'chat' | 'query_embed' | 'ingest' | 'rerank';

export const groupId = (runId: string, kind: UsageKind, step: number) => `${runId}:${kind}:${step}`;

export interface AttemptKey {
  runId: string;
  rootRunId: string;
  kind: UsageKind;
  logicalStep: number;
  candidate: number;
  batch?: number;
}

export interface AttemptReceipt {
  id: string;
  groupId: string;
  status: string;
  /** Đã có từ trước (chạy lại) — người gọi không gửi lại nếu status ≠ dispatched / rejected. */
  existing: boolean;
}

/** Chi phí thô đúng (không làm tròn): (in × giá in + out × giá out) / 1000 — Decimal, không float. */
export function rawCost(tokensIn: number, tokensOut: number, price: { per1kIn: number | string; per1kOut: number | string }): Prisma.Decimal {
  return new Prisma.Decimal(tokensIn).mul(price.per1kIn).add(new Prisma.Decimal(tokensOut).mul(price.per1kOut)).div(1000);
}

/** Ghi biên nhận lần gọi (giá chụp) — idempotent theo khoá lần gọi. */
export async function openAttempt(db: Db, k: AttemptKey, c: { provider: string; model: string; price: { per1kIn: number; per1kOut: number }; source: string }, now: Date): Promise<AttemptReceipt> {
  const gid = groupId(k.runId, k.kind, k.logicalStep);
  await db.$executeRaw`
    INSERT INTO ai_usage_group (id, run_id, root_run_id, kind, logical_step, created_at)
    VALUES (${gid}, ${k.runId}::uuid, ${k.rootRunId}::uuid, ${k.kind}, ${k.logicalStep}, ${now})
    ON CONFLICT (id) DO NOTHING`;
  const key = { groupId: gid, candidate: k.candidate, batch: k.batch ?? 0 };
  const prior = await db.aiUsageReceipt.findUnique({ where: { groupId_candidate_batch: key }, select: { id: true, status: true } });
  if (prior) return { id: prior.id, groupId: gid, status: prior.status, existing: true };
  const id = uuidv7(now.getTime());
  await db.$executeRaw`
    INSERT INTO ai_usage_receipt (id, group_id, run_id, root_run_id, logical_step, candidate, batch, provider, model, price_in, price_out, source, created_at, updated_at)
    VALUES (${id}::uuid, ${gid}, ${k.runId}::uuid, ${k.rootRunId}::uuid, ${k.logicalStep}, ${k.candidate}, ${k.batch ?? 0}, ${c.provider}, ${c.model}, ${c.price.per1kIn}, ${c.price.per1kOut}, ${c.source}, ${now}, ${now})
    ON CONFLICT (group_id, candidate, batch) DO NOTHING`;
  const row = await db.aiUsageReceipt.findUniqueOrThrow({ where: { groupId_candidate_batch: key }, select: { id: true, status: true } });
  return { id: row.id, groupId: gid, status: row.status, existing: row.id !== id };
}

/** Ghi kết quả lần gọi: `rejected` (không usage), `unknown` (không rõ — cách ly), `usage_known` (kèm token + chi phí thô theo giá chụp). */
export async function recordOutcome(db: Db, receiptId: string, o: { kind: 'rejected' | 'unknown'; error: string; latencyMs: number } | { kind: 'usage'; tokensIn: number; tokensOut: number; latencyMs: number }, now: Date): Promise<void> {
  if (o.kind !== 'usage') {
    await db.aiUsageReceipt.updateMany({ where: { id: receiptId, status: 'dispatched' }, data: { status: o.kind, error: o.error.slice(0, 200), latencyMs: o.latencyMs, updatedAt: now } });
    return;
  }
  const r = await db.aiUsageReceipt.findUniqueOrThrow({ where: { id: receiptId }, select: { priceIn: true, priceOut: true } });
  const cost = rawCost(o.tokensIn, o.tokensOut, { per1kIn: r.priceIn.toString(), per1kOut: r.priceOut.toString() });
  // Biên nhận `unknown` nhận usage muộn (đối soát) vẫn được ghi — chỉ đi tới, không lùi trạng thái đã quyết toán.
  await db.aiUsageReceipt.updateMany({ where: { id: receiptId, status: { in: ['dispatched', 'unknown'] } }, data: { status: 'usage_known', tokensIn: o.tokensIn, tokensOut: o.tokensOut, rawCost: cost, latencyMs: o.latencyMs, updatedAt: now } });
}
