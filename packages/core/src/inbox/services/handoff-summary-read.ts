// Đọc tóm tắt bàn giao (TIP-022b C) — `GET /v1/conversations/:id/handoff-summary`: hội thoại phải đọc được; tham chiếu bản ghi trong tóm
// tắt chiếu theo quyền HIỆN TẠI của người xem (guard đọc của từng domain), không theo quyền agent / người tạo. Không đi ra khách.
import { handoffSummarySchema, type AuthzContext, type HandoffSummaryDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { visibleAppointment } from '../../booking/booking-access';
import { visibleContract } from '../../contracts/contract-access';
import { visibleContact } from '../../crm/services/access';
import { visibleOrder } from '../../sales/orders/order-access';
import { visibleInvoice } from '../../sales/payments/invoice-access';
import { visibleQuote } from '../../sales/quotes/quote-access';
import { visibleTicket } from '../../support/ticket-access';
import { projectSummary } from '../../ai/reply/handoff-summary';
import { visibleConversation } from './access';

type Guard = (tx: TenantTx, a: AuthzContext, id: string) => Promise<unknown>;
const GUARDS: Record<string, Guard> = {
  contact: visibleContact,
  quote: visibleQuote,
  order: visibleOrder,
  appointment: visibleAppointment,
  ticket: visibleTicket,
  invoice: visibleInvoice,
  contract: visibleContract,
};

export async function readHandoffSummary(tx: TenantTx, authz: AuthzContext, conversationId: string): Promise<HandoffSummaryDto | null> {
  const c = await visibleConversation(tx, authz, conversationId);
  const parsed = handoffSummarySchema.safeParse(c.handoffSummary);
  if (!parsed.success) return null;
  return projectSummary(parsed.data, async (type, id) => {
    const g = GUARDS[type];
    if (!g) return false;
    return g(tx, authz, id).then(() => true, () => false);
  });
}
