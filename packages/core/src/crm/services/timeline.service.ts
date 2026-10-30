// Dòng thời gian của khách (Hồ sơ 360° — F02; Blueprint §2.2 `timeline_event`). Ghi lưu KHOÁ chữ + tham số trong `payload`
// (`summary` giữ bản vi cho log / tìm kiếm); đọc render theo locale người xem (i18n §8). Domain khác ghi qua `TimelineWriter`.
import { createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export type TimelineKey = 'created' | 'stage' | 'owner' | 'merge' | 'note' | 'email';
type TimelineType = 'message' | 'quote' | 'order' | 'invoice' | 'payment' | 'appointment' | 'ticket' | 'note' | 'ai_action' | 'loyalty' | 'campaign' | 'stage' | 'owner' | 'merge';

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
