// Hồ sơ 360° (`GET /v1/contacts/:id` — F02; shape `contact360Schema`). Phần của crm: thông tin, giai đoạn, ghi chú, dòng thời gian,
// trường tuỳ biến, bố cục theo vai trò. Phần domain khác (đơn / báo giá / loyalty / việc / AI) rỗng / 0 tới TIP chủ (027–039, AI).
import { avatarColor, createFmt, initialsOf, serverMessages, type Contact360Dto, type CustomValues } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { renderTimeline } from './timeline.service';

interface Ctx {
  locale: string;
  timeZone: string;
  names: (ids: string[]) => Promise<Map<string, string>>;
  layout?: Contact360Dto['layout'];
}

export async function contact360(tx: TenantTx, contactId: string, c: Ctx): Promise<Contact360Dto> {
  const k = await tx.contact.findUniqueOrThrow({ where: { id: contactId } });
  const [notes, events] = await Promise.all([
    tx.contactNote.findMany({ where: { contactId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    tx.timelineEvent.findMany({ where: { contactId }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 30, select: { id: true, type: true, summary: true, payload: true, occurredAt: true } }),
  ]);
  const m = serverMessages(c.locale).crm;
  const fmt = createFmt({ locale: c.locale, timeZone: c.timeZone });
  const who = await c.names(notes.map((n) => n.authorUserId));
  const timeline = renderTimeline(events, c.locale, c.timeZone).map(({ icon, tone, when, text }) => ({ icon, tone, when, text }));
  const [last, ...older] = notes;
  return {
    id: k.id,
    name: k.name,
    initials: initialsOf(k.name),
    avatar_color: avatarColor(k.id),
    tier: k.tierKey ?? '',
    since: fmt.date(k.createdAt),
    stage_label: m.stage[k.stage],
    lead_score: 0,
    lead_level: '',
    phone: k.phone ?? '',
    company: k.kind === 'business' ? k.name : '',
    email: k.email ?? '',
    role: k.title ?? '',
    points: String(k.pointsBalance),
    points_value: String(k.pointsBalance * 10n),
    journey: { stage: m.stage[k.stage], hint: '' },
    ai_summary: { badge: '', close_pct: 0, bullets: k.aiSummary ? [k.aiSummary] : [] },
    deal: { title: '', value: '0', stage: '', probability: 0, close_date: '', need: '' },
    history: timeline.slice(0, 6),
    tasks: [],
    note: last ? { body: last.body, meta: `${who.get(last.authorUserId) ?? ''} · ${fmt.date(last.createdAt)} ${fmt.time(last.createdAt)}` } : { body: '', meta: '' },
    comments: older.slice(0, 10).map((n) => {
      const author = who.get(n.authorUserId) ?? '';
      return { author, initial: (author[0] ?? '?').toUpperCase(), body: n.body, at: `${fmt.date(n.createdAt)} ${fmt.time(n.createdAt)}` };
    }),
    crm: {
      kpis: [],
      open_deal: { title: '', meta: '', value: '' },
      recent_order: { title: '', status: '' },
      recent_payment: { title: '', status: '' },
      segments: [],
    },
    ai: { bars: [], signals: [], predict: { close: '', revenue: '' }, churn: '', nba: [] },
    timeline,
    files: [],
    custom: (k.custom ?? {}) as CustomValues,
    ...(c.layout ? { layout: c.layout } : {}),
  };
}
