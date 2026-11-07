// `GET /v1/billing/quote` (TIP-039 AC03 / AC09): giá server tính cho mua / gia hạn / nâng / đổi xuống / addon — đọc, không khoá, không sinh mã
// (cùng `InvoicesService.quote` của preview action). FE hiện số tiền + cách tính trong hộp xác nhận trước khi `billing.create_invoice`.
import { AppError, type BillQuoteDto } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { CreateInvoiceInput, InvoicesService } from '../payments/invoices.service';
import type { InvoiceSnapshot } from '../lifecycle/types';

const KINDS = ['plan', 'credit', 'addon'] as const;

/** Query string → input mua (400 khi lạ — không ghép từ input tự do). */
export function parseQuoteInput(q: { kind?: string; item?: string; period?: string }): CreateInvoiceInput {
  if (!q.kind || !(KINDS as readonly string[]).includes(q.kind)) throw new AppError('VALIDATION_FAILED', 400, { kind: 'invalid' });
  if (!q.item || !/^[a-z0-9_]{1,40}$/.test(q.item)) throw new AppError('VALIDATION_FAILED', 400, { item: 'invalid' });
  if (q.period && q.period !== 'month' && q.period !== 'year') throw new AppError('VALIDATION_FAILED', 400, { period: 'invalid' });
  return { kind: q.kind as CreateInvoiceInput['kind'], item: q.item, ...(q.period ? { period: q.period as 'month' | 'year' } : {}) };
}

export async function quoteView(
  db: Pick<PlatformDb, 'plan' | 'billingInvoice' | 'subscription'>,
  invoices: Pick<InvoicesService, 'quote'>,
  workspaceId: string,
  i: CreateInvoiceInput,
): Promise<BillQuoteDto> {
  const q = await invoices.quote(db, workspaceId, i);
  const s = q.snapshot as Partial<InvoiceSnapshot>;
  const mode = 'mode' in s && s.mode ? s.mode : q.kind === 'credits' ? 'credits' : 'new';
  return {
    mode,
    amount: String(q.amount),
    credits: q.credits,
    months: q.months,
    starts_at: s.mode === 'renew' || s.mode === 'switch' ? (s.starts_at ?? null) : null,
    ends_at: (s.mode === 'upgrade' ? s.term_end : s.mode === 'addon' ? s.ends_at : null) ?? null,
    from_plan_key: (s.mode === 'upgrade' ? s.from_plan_key : null) ?? null,
    open: q.open,
  };
}
