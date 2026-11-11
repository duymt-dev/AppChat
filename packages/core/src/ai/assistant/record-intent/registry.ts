// Sổ ý định theo bản ghi (TIP-023g §1.1): cặp (thực thể, ý định) hợp lệ + action đọc chuẩn của thực thể + quyền đọc nền. Server là nguồn
// duy nhất — UI chỉ gửi gợi ý. Cặp lạ → 422. Việc follow không có action `.get` chuẩn → đọc qua facade insights (`visibleFollowUp`).
import { AppError, isRecordIntentPair, PROPOSAL_INTENTS, recordIntentSchema, type RecordEntity, type RecordIntentInput, type RecordIntentKind } from '@appchat/shared';

export interface RecordEntityDef {
  /** Action đọc chuẩn (quyền + scope + chiếu trường của domain). null = đọc qua facade riêng (follow_up). */
  getter: string | null;
  /** Khoá id trong input của getter. */
  idKey: string;
}

export const RECORD_ENTITY_DEFS: Readonly<Record<RecordEntity, RecordEntityDef>> = {
  quote: { getter: 'quote.get', idKey: 'quote_id' },
  contract: { getter: 'contract.get', idKey: 'contract_id' },
  order: { getter: 'order.get', idKey: 'order_id' },
  appointment: { getter: 'appointment.get', idKey: 'appointment_id' },
  follow_up: { getter: null, idKey: 'follow_up_id' },
  ticket: { getter: 'ticket.get', idKey: 'ticket_id' },
  invoice: { getter: 'invoice.get', idKey: 'invoice_id' },
  product: { getter: 'product.get', idKey: 'product_id' },
};

/** Parse + kiểm cặp. Lỗi khuôn / cặp lạ → 422 (không lộ gì về bản ghi). */
export function parseRecordIntent(raw: unknown): RecordIntentInput {
  const r = recordIntentSchema.safeParse(raw);
  if (!r.success) throw new AppError('VALIDATION_FAILED', 422, { record_intent: 'invalid' });
  if (!isRecordIntentPair(r.data.entity, r.data.intent)) throw new AppError('VALIDATION_FAILED', 422, { record_intent: 'unsupported_pair' });
  return r.data;
}

export const isProposalIntent = (i: RecordIntentKind): boolean => PROPOSAL_INTENTS.includes(i);
