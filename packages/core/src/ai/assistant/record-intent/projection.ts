// Kiểm + chiếu đề xuất theo bản ghi (TIP-023g §3.2–3.3, §3.6): chữ thô → khuôn chặt (shared schema) → đọc lại nguồn + từng sản phẩm của
// combo theo quyền HIỆN HÀNH; thiếu / ẩn → vô hiệu (đề xuất cũ). Giá trong kết quả là giá danh mục hiện hành, không bao giờ chữ của model.
// Người đọc (GET / phát lại) chiếu lại theo quyền hiện hành — chưa công bố thì chỉ trạng thái, không chữ thô / tham chiếu ẩn.
import { AppError, campaignProposalSchema, comboProposalSchema, parseModelJson, type RecordProposalDto } from '@appchat/shared';
import type { ToolExecutor } from '../../../kernel/actions/executor';
import { assistantActionCtx } from '../meta-tools';
import type { AssistantTurnCtx } from '../types';
import type { ProposalBinding } from './admission';

export type Validated = { ok: true; result: object } | { ok: false; reason: 'malformed_output' | 'stale_product' | 'source_changed' };

async function productNow(executor: ToolExecutor, t: AssistantTurnCtx, id: string): Promise<{ name: string; price: string | null; version?: number } | null> {
  try {
    const out = await executor.execute<{ name: string; price: string; version?: number }>(assistantActionCtx(t, -1), 'product.get', { product_id: id });
    return out.status === 200 ? { name: out.data.result.name, price: out.data.result.price ?? null } : null;
  } catch (e) {
    if (e instanceof AppError && e.httpStatus < 500) return null;
    throw e;
  }
}

/** Kiểm chữ thô theo khuôn + nguồn / sản phẩm hiện hành (quyền của người gọi). Không gọi model. */
export async function validateProposal(executor: ToolExecutor, t: AssistantTurnCtx, b: Pick<ProposalBinding, 'intent' | 'entityId'>, text: string): Promise<Validated> {
  let raw: unknown;
  try {
    raw = parseModelJson(text);
  } catch {
    return { ok: false, reason: 'malformed_output' };
  }
  if (!(await productNow(executor, t, b.entityId))) return { ok: false, reason: 'source_changed' };
  if (b.intent === 'product_campaign') {
    const c = campaignProposalSchema.safeParse(raw);
    return c.success ? { ok: true, result: { campaign: c.data } } : { ok: false, reason: 'malformed_output' };
  }
  const c = comboProposalSchema.safeParse(raw);
  if (!c.success) return { ok: false, reason: 'malformed_output' };
  const items = [];
  for (const it of c.data.items) {
    const p = await productNow(executor, t, it.product_id);
    if (!p) return { ok: false, reason: 'stale_product' };
    items.push({ product_id: it.product_id, qty: it.qty, name: p.name, price: p.price });
  }
  return { ok: true, result: { combo: { ...c.data, items } } };
}

/** DTO an toàn của binding: chỉ trạng thái khi chưa công bố; đã công bố → kết quả đã kiểm. */
export function proposalDto(b: ProposalBinding): RecordProposalDto {
  const base = { id: b.id, request_id: b.requestId, run_id: b.runId, entity: b.entity, entity_id: b.entityId, intent: b.intent } as Pick<RecordProposalDto, 'id' | 'request_id' | 'run_id' | 'entity' | 'entity_id' | 'intent'>;
  if (b.phase === 'validated') return { ...base, state: 'validated', ...(b.publishedResult as object) };
  if (b.phase === 'failed') return { ...base, state: 'failed', ...(b.safeReason ? { reason: b.safeReason } : {}) };
  if (b.phase === 'invalidated') return { ...base, state: 'invalidated', ...(b.safeReason ? { reason: b.safeReason } : {}) };
  return { ...base, state: 'pending' };
}
