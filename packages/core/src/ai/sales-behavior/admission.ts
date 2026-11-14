// Cổng nhận quyết định báo giá từ ý định khách (TIP-022c §1.1–1.7): mỗi lời gọi `quote.mark_accepted` / `request_revision` /
// `mark_rejected` của agent trực kênh đi qua đây TRƯỚC Executor — chụp nguồn tin cậy → (biên nhận đã có của nguồn? dùng lại đúng nó) →
// báo giá có thể quyết định → phân loại chỉ đọc → báo giá đích + ngưỡng 70% → ghi biên nhận `prepared` → handle nội bộ (agent.runtime niêm
// phong vào ctx của đúng lời gọi). Thiếu bất kỳ bước nào → lỗi tool có lý do để model hỏi lại / chuyển người; không hiệu ứng báo giá nào.
import type { PiiMap } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { serverMessages, type AuthzContext } from '@appchat/shared';
import { CUSTOMER_INTENT_ACTIONS, type CustomerIntentAction, type CustomerIntentHandle } from '../../kernel/actions/customer-intent';
import type { AiRunner } from '../runs/runner';
import { captureSource } from './source';
import { admitDecision, classifyIntent, decidableQuotes } from './quote-intent';
import { prepareReceipt, receiptOfSource } from './receipts';
import { isDeny, type DenyReason } from './types';

export interface SalesTurn {
  db: TenantDb;
  runner: AiRunner;
  now: () => Date;
  ws: string;
  runId: string;
  conversationId: string;
  pii: PiiMap;
  locale: 'vi' | 'en';
  tier: string;
}

export type GateResult = CustomerIntentHandle | { deny: DenyReason; message: string };

const denied = (reason: DenyReason, locale: 'vi' | 'en'): GateResult => ({ deny: reason, message: serverMessages(locale).ai.salesIntent[reason] });

const quoteIdOf = (input: unknown) => {
  const v = (input ?? {}) as { quote_id?: unknown };
  return typeof v.quote_id === 'string' ? v.quote_id : '';
};

export async function admitQuoteDecision(t: SalesTurn, actionId: CustomerIntentAction, input: unknown, authz: AuthzContext): Promise<GateResult> {
  const src = await captureSource(t.db, t.runId, t.conversationId, t.pii);
  if (isDeny(src)) return denied(src.deny, t.locale);
  const asked = quoteIdOf(input);
  // Nguồn đã có quyết định: chỉ đúng biên nhận đó (cùng run + ý định + báo giá) — không phân loại lại, không đổi đích. Đã `consumed` vẫn
  // đi tiếp: cùng lời gọi (khoá idempotent) nhận lại kết quả cũ ở Executor; lời gọi khác → guard domain 409 `consumed`, không hiệu ứng thứ hai.
  const prior = await receiptOfSource(t.db, src);
  if (prior) {
    const same = prior.runId === t.runId && prior.intent === CUSTOMER_INTENT_ACTIONS[actionId] && prior.quoteId === asked && prior.state !== 'invalidated';
    return same ? { receiptId: prior.id, actionId, quoteId: prior.quoteId, runId: t.runId } : denied('source_already_decided', t.locale);
  }
  const quotes = await decidableQuotes(t.db, authz, src);
  if (!quotes.length) return denied('quote_not_open', t.locale);
  const r = await classifyIntent({ db: t.db, runner: t.runner, now: t.now, ws: t.ws, parentRunId: t.runId, locale: t.locale, tier: t.tier }, src, quotes);
  if (!r.c) return denied(r.failed ? 'classifier_unavailable' : 'intent_invalid', t.locale);
  const quote = admitDecision(r.c, quotes, actionId);
  if (isDeny(quote)) return denied(quote.deny, t.locale);
  // Model phải gọi đúng báo giá mà khách nói tới (server giải) — gọi báo giá khác là không có căn cứ.
  if (quote.id !== asked) return denied('quote_mismatch', t.locale);
  const rec = await prepareReceipt(t.db, src, { runId: t.runId, actionId, quote, classification: r.c, classifierRunId: r.runId }, t.now());
  if (isDeny(rec)) return denied(rec.deny, t.locale);
  return { receiptId: rec.id, actionId, quoteId: rec.quoteId, runId: t.runId };
}
