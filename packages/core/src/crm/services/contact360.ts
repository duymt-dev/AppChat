// Hồ sơ 360° (`GET /v1/contacts/:id` — F02; shape `contact360Schema`). Phần của crm: thông tin, giai đoạn, ghi chú, dòng thời gian,
// trường tuỳ biến, bố cục theo vai trò. KPI / đơn / thu / liên kết chứng từ theo quyền người xem: crm/insights (TIP-015b, ghép ở CrmReadService).
import { avatarColor, createFmt, initialsOf, serverMessages, type ActivitySummaryDto, type Contact360Dto, type CustomValues } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { renderTimeline } from './timeline.service';
import { contactAvatarLink } from '../../channels/operations/avatar-read';
import type { FileLinks } from '../../kernel/files/file-links';
import { familyIds } from '../lifecycle/lock';

interface Ctx {
  locale: string;
  timeZone: string;
  names: (ids: string[]) => Promise<Map<string, string>>;
  layout?: Contact360Dto['layout'];
  /** Link ký ảnh đồng bộ từ kênh (TIP-014b D). */
  links?: { files: FileLinks | null; ws: string };
}

export async function contact360(tx: TenantTx, contactId: string, c: Ctx): Promise<Contact360Dto> {
  const k = await tx.contact.findUniqueOrThrow({ where: { id: contactId } });
  const events = await tx.timelineEvent.findMany({ where: { contactId: { in: await familyIds(tx, contactId) } }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 30, select: { id: true, type: true, summary: true, payload: true, occurredAt: true } });
  const m = serverMessages(c.locale).crm;
  const fmt = createFmt({ locale: c.locale, timeZone: c.timeZone });
  const timeline = renderTimeline(events, c.locale, c.timeZone).map(({ icon, tone, when, text }) => ({ icon, tone, when, text }));
  // Ảnh nhân viên đặt luôn thắng; không có → ảnh đồng bộ từ kênh (link ký).
  const avatar = k.avatarUrl || (c.links ? await contactAvatarLink(tx, c.links.files, c.links.ws, k.id) : null);
  return {
    id: k.id,
    name: k.name,
    initials: initialsOf(k.name),
    avatar_color: avatarColor(k.id),
    ...(avatar ? { avatar_url: avatar } : {}),
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
    // 1 điểm = 100đ (COMMERCE §7 — TIP-036; trước đây ×10 sai luật).
    points_value: String(k.pointsBalance * 100n),
    journey: { stage: m.stage[k.stage], hint: '' },
    // Không đọc `contact.ai_summary` cũ (chung mọi vai trò — có thể lộ công nợ); tóm tắt theo phạm vi người xem ở contact.summarize (TIP-015b).
    ai_summary: { badge: '', close_pct: 0, bullets: [] },
    deal: { title: '', value: '0', stage: '', probability: 0, close_date: '', need: '' },
    history: timeline.slice(0, 6),
    // Ghi chú / bình luận / việc thật điền ở `withActivities` (TIP-026b — đúng loại, theo quyền người xem).
    tasks: [],
    note: { body: '', meta: '' },
    comments: [],
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

/**
 * Ghép hoạt động CRM thật (TIP-026b) vào Hồ sơ 360°: ô cũ `note` / `comments` / `tasks` / `deal` lấy từ reader (ghi chú chỉ kind note,
 * bình luận chỉ kind comment — không gắn nhãn lại ghi chú cũ). Cơ hội không có / tiền bị ẩn → ô rỗng thật, không "0" giả.
 */
export function withActivities(p: Contact360Dto, a: ActivitySummaryDto, c: { locale: string; timeZone: string }): Contact360Dto {
  const fmt = createFmt({ locale: c.locale, timeZone: c.timeZone });
  const at = (iso: string) => `${fmt.date(new Date(iso))} ${fmt.time(new Date(iso))}`;
  const n = a.notes.latest;
  const o = a.opportunity.current;
  return {
    ...p,
    note: n ? { body: n.body, meta: `${n.author.name} · ${at(n.created_at)}` } : { body: '', meta: '' },
    comments: a.comments.items.map((x) => ({ author: x.author.name, initial: (x.author.name[0] ?? '?').toUpperCase(), body: x.body, at: at(x.created_at) })),
    tasks: a.tasks.items.map((t) => ({ id: t.id, title: t.title, due: t.due_at ? at(t.due_at) : '', done: t.state === 'done' })),
    deal: o
      ? { title: o.title, value: o.amount_vnd ?? '', stage: o.stage, probability: o.probability ?? 0, close_date: o.expected_close_date ?? '', need: o.need }
      : p.deal,
    activities: a,
  };
}
