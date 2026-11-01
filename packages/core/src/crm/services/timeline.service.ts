// Dòng thời gian của khách (Hồ sơ 360° — F02; Blueprint §2.2 `timeline_event`). Ghi lưu KHOÁ chữ + tham số trong `payload`
// (`summary` giữ bản vi cho log / tìm kiếm); đọc render theo locale người xem (i18n §8). Domain khác ghi qua `TimelineWriter`.
import { createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export type TimelineKey = 'created' | 'stage' | 'owner' | 'merge' | 'note' | 'email' | 'quote_sent' | 'quote_viewed' | 'quote_accepted' | 'quote_rejected' | 'quote_expired' | 'contract_sent' | 'contract_signed' | 'contract_declined' | 'contract_terminated' | 'contract_expired' | 'order_created' | 'order_confirmed' | 'order_completed' | 'order_cancelled' | 'order_imported' | 'invoice_sent' | 'invoice_paid' | 'invoice_void' | 'refund_requested' | 'refund_approved' | 'refund_rejected' | 'package_granted' | 'package_extended' | 'package_adjusted' | 'appointment_booked' | 'appointment_rescheduled' | 'appointment_done' | 'appointment_no_show' | 'appointment_cancelled' | 'package_session_used' | 'ticket_opened' | 'ticket_closed' | 'ticket_reopened';
type TimelineType = 'message' | 'quote' | 'contract' | 'order' | 'invoice' | 'payment' | 'appointment' | 'ticket' | 'note' | 'ai_action' | 'loyalty' | 'campaign' | 'stage' | 'owner' | 'merge';

export interface TimelineInput {
  contactId: string;
  type: TimelineType;
  key: TimelineKey;
  params?: Record<string, string | number>;
  actor: { type: string; id: string | null };
  ref?: { type: string; id: string };
  at: Date;
}

const STYLE: Record<string, { icon: string; tone: string }> = {
  created: { icon: 'ic-user-plus', tone: 'brand' },
  stage: { icon: 'ic-trend', tone: 'violet' },
  owner: { icon: 'ic-users', tone: 'amber' },
  merge: { icon: 'ic-copy', tone: 'muted' },
  note: { icon: 'ic-edit', tone: 'muted' },
  email: { icon: 'ic-mail', tone: 'ok' },
  message: { icon: 'ic-inbox', tone: 'zalo' },
  quote_sent: { icon: 'ic-doc', tone: 'brand' },
  quote_viewed: { icon: 'ic-mail', tone: 'violet' },
  quote_accepted: { icon: 'ic-check', tone: 'ok' },
  quote_rejected: { icon: 'ic-x', tone: 'muted' },
  quote_expired: { icon: 'ic-clock', tone: 'amber' },
  contract_sent: { icon: 'ic-send', tone: 'brand' },
  contract_signed: { icon: 'ic-check', tone: 'ok' },
  contract_declined: { icon: 'ic-x', tone: 'muted' },
  contract_terminated: { icon: 'ic-x', tone: 'muted' },
  contract_expired: { icon: 'ic-clock', tone: 'amber' },
  order_created: { icon: 'ic-cart', tone: 'brand' },
  order_confirmed: { icon: 'ic-check', tone: 'brand' },
  order_completed: { icon: 'ic-check', tone: 'ok' },
  order_cancelled: { icon: 'ic-x', tone: 'muted' },
  order_imported: { icon: 'ic-cart', tone: 'brand' },
  invoice_sent: { icon: 'ic-send', tone: 'brand' },
  invoice_paid: { icon: 'ic-check', tone: 'ok' },
  invoice_void: { icon: 'ic-x', tone: 'muted' },
  refund_requested: { icon: 'ic-dollar', tone: 'amber' },
  refund_approved: { icon: 'ic-dollar', tone: 'muted' },
  refund_rejected: { icon: 'ic-x', tone: 'muted' },
  package_granted: { icon: 'ic-gift', tone: 'ok' },
  package_extended: { icon: 'ic-clock', tone: 'brand' },
  package_adjusted: { icon: 'ic-gift', tone: 'brand' },
  appointment_booked: { icon: 'ic-cal', tone: 'brand' },
  appointment_rescheduled: { icon: 'ic-cal', tone: 'amber' },
  appointment_done: { icon: 'ic-check', tone: 'ok' },
  appointment_no_show: { icon: 'ic-clock', tone: 'amber' },
  appointment_cancelled: { icon: 'ic-x', tone: 'muted' },
  package_session_used: { icon: 'ic-gift', tone: 'brand' },
  ticket_opened: { icon: 'ic-ticket', tone: 'amber' },
  ticket_closed: { icon: 'ic-check', tone: 'ok' },
  ticket_reopened: { icon: 'ic-ticket', tone: 'amber' },
};

export async function writeTimeline(tx: TenantTx, e: TimelineInput): Promise<string> {
  const id = uuidv7(e.at.getTime());
  const params = e.params ?? {};
  await tx.timelineEvent.create({
    data: {
      id,
      contactId: e.contactId,
      type: e.type,
      refType: e.ref?.type ?? null,
      refId: e.ref?.id ?? null,
      actorType: e.actor.type,
      actorId: e.actor.id,
      summary: interpolate(serverMessages('vi').crm.timeline[e.key], params),
      payload: { key: e.key, params },
      occurredAt: e.at,
    },
  });
  return id;
}

export interface TimelineRow {
  id: string;
  type: string;
  summary: string;
  payload: unknown;
  occurredAt: Date;
}

/** Một dòng → `{ icon, tone, when, text }` (TimelineItem của FE) + `id`, `at`. */
export function renderTimeline(rows: TimelineRow[], locale: string, timeZone: string) {
  const m = serverMessages(locale).crm;
  const fmt = createFmt({ locale, timeZone });
  return rows.map((r) => {
    const p = (r.payload ?? {}) as { key?: string; params?: Record<string, string | number> };
    const params = { ...(p.params ?? {}) };
    // Giai đoạn lưu dạng khoá → dịch theo locale người xem.
    for (const k of ['from', 'to'] as const) if (r.type === 'stage' && typeof params[k] === 'string') params[k] = m.stage[params[k] as keyof typeof m.stage] ?? params[k]!;
    const tpl = p.key && p.key in m.timeline ? m.timeline[p.key as TimelineKey] : null;
    const style = STYLE[p.key ?? ''] ?? STYLE[r.type] ?? STYLE.note!;
    return {
      id: r.id,
      at: r.occurredAt.toISOString(),
      icon: style.icon,
      tone: style.tone,
      when: `${fmt.date(r.occurredAt)} ${fmt.time(r.occurredAt)}`,
      text: tpl ? interpolate(tpl, params) : r.summary,
    };
  });
}
