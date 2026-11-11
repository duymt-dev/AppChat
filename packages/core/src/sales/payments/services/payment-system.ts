// Việc hệ thống của khoản thu (Blueprint §1.4 scheduler "công nợ T+1 / T+7", §2.3 event; COMMERCE §5 / §6): quét mỗi workspace —
// đề nghị quá hạn → `overdue` (+ event `invoice.overdue`); nhắc khách qua hội thoại đã gửi ở T-1 / T+1 / T+7 (mỗi mốc một lần — ghi
// `reminders_sent`, tin đi hàng gửi chung của kênh); liệu trình quá hạn → `expired`. Consumer `order.confirmed` sinh liệu trình cho đơn
// đã thu đủ trước khi xác nhận. Đọc lại + khoá dòng trong transaction (state-machine §1.4).
import { INVOICE_REMINDERS, daysLeft } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import type { CrmMembers } from '../../../crm/public';
import type { Outgoing } from '../../../inbox/public';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import { invoiceText, postInvoice, type InvoiceChannel } from './invoice-send';
import { grantPackages } from './packages';
import { localDay, statusAfter } from './payment-write';
import { inEventTransaction } from '../../../kernel/outbox/transaction';

const BATCH = 200;
const SYSTEM = { type: 'system', id: null };

/** Đề nghị đã gửi / thu một phần mà qua hạn → overdue. Trả số đề nghị đã chuyển. */
export async function markOverdue(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const today = localDay(now, timeZone);
  const due = await db.invoice.findMany({ where: { status: { in: ['sent', 'partial'] }, dueDate: { lt: new Date(`${today}T00:00:00Z`) } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const moved = await inEventTransaction(db, ws, async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
      const i = await tx.invoice.findUnique({ where: { id } });
      if (!i || (i.status !== 'sent' && i.status !== 'partial')) return false;
      const to = statusAfter(i, i.paidAmount, today);
      if (to !== 'overdue') return false;
      await tx.invoice.update({ where: { id }, data: { status: to, version: { increment: 1 }, updatedAt: now } });
      await writeOutbox(tx, ws, [{ topic: 'invoice.overdue', payload: { invoice_id: i.id, contact_id: i.contactId, order_id: i.orderId, code: i.code, amount: String(i.amount - i.paidAmount), status: to } }], now);
      return true;
    });
    if (moved) n++;
  }
  return n;
}

/** Nhắc công nợ T-1 / T+1 / T+7 (mỗi mốc một lần — mốc gần nhất đã tới; chỉ đề nghị đã gửi qua hội thoại). Lỗi kênh một đề nghị không chặn đề nghị khác. */
export async function remindDue(db: TenantDb, ws: string, now: Date, timeZone: string, d: QuoteDeps, members: CrmMembers, enqueue: (o: Outgoing) => Promise<void>): Promise<number> {
  const today = localDay(now, timeZone);
  const span = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000);
  const rows = await db.invoice.findMany({
    where: { status: { in: ['sent', 'partial', 'overdue'] }, conversationId: { not: null }, dueDate: { gte: span(-8), lte: span(1) } },
    select: { id: true },
    take: BATCH,
  });
  const ctx: ActionContext = { workspaceId: ws, source: 'system', actor: { type: 'system', id: 'invoice-remind' }, authz: { isOwner: true } } as never;
  let n = 0;
  for (const { id } of rows) {
    try {
      const out = await inEventTransaction(db, ws, async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${id}::uuid FOR UPDATE`;
        const i = await tx.invoice.findUnique({ where: { id } });
        if (!i || !i.conversationId || !['sent', 'partial', 'overdue'].includes(i.status)) return null;
        const offset = -daysLeft(now, i.dueDate, timeZone);
        const sent = i.remindersSent as { key: string }[];
        // Mốc gần nhất đã tới (lỡ lần quét — máy dừng — vẫn nhắc mốc đó, không dồn các mốc cũ); đã gửi thì thôi.
        const step = [...INVOICE_REMINDERS].reverse().find((r) => r.offset <= offset);
        if (!step || sent.some((s) => s.key === step.key)) return null;
        const channel = (i.sentChannel ?? 'zalo_personal') as InvoiceChannel;
        const text = await invoiceText(tx, d, ws, i, 'remind', now);
        const r = await postInvoice(ctx, tx, d, members, i, { channel, text, now, system: true });
        await tx.invoice.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString(), channel, by: null }] as object[], updatedAt: now } });
        await writeOutbox(tx, ws, r.events, now);
        return r.out;
      });
      if (out) {
        await enqueue(out);
        n++;
      }
    } catch {
      // Kênh của khách không còn gửi được (đã ngắt / lưu trữ) — bỏ qua mốc này, lần quét sau thử lại cho tới khi qua ngày.
    }
  }
  return n;
}

/** Consumer `order.confirmed`: đơn đã thu đủ trước khi xác nhận → sinh liệu trình. */
export async function packagesOnConfirm(db: TenantDb, ws: string, orderId: string, now: Date): Promise<void> {
  await inEventTransaction(db, ws, async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${orderId}::uuid FOR UPDATE`;
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) return;
    const events = await grantPackages(tx, o, SYSTEM, now);
    if (events.length) await writeOutbox(tx, ws, events, now);
  });
}
