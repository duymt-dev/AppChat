// Đọc insight khách (TIP-015b): khối số liệu Hồ sơ 360° (`insights` + `crm.kpis` / `recent_order` / `recent_payment` đã định dạng) và dữ
// liệu thật cho `GET /v1/crm/ai` (đếm run AI theo phạm vi người xem + peek ≤ 5 lượt gần nhất — không gọi model mỗi GET). Không quyền phần
// nào → phần đó vắng / null, không hiện 0 giả. Không bao giờ đọc `contact.ai_summary` cũ (có thể chứa công nợ do Owner tạo).
import { createFmt, interpolate, serverMessages, utcToWall, type ContactInsightsDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { AuthzContext } from '@appchat/shared';
import { customerKpis } from './customer-kpis';
import { customerLinks } from './customer-links';

interface Place {
  locale: string;
  timeZone: string;
  now: Date;
}

export interface Insights360 {
  insights: ContactInsightsDto;
  kpis: [string, string][];
  recent_order: { title: string; status: string };
  recent_payment: { title: string; status: string };
}

/** Insight 360° của một khách theo quyền người xem (đã kiểm visibleContact ở ngoài). */
export async function insights360(tx: TenantTx, a: AuthzContext, contactId: string, p: Place): Promise<Insights360> {
  const today = utcToWall(p.now, p.timeZone).date;
  const [k, links] = await Promise.all([customerKpis(tx, a, contactId, today), customerLinks(tx, a, contactId, p.now)]);
  const m = serverMessages(p.locale).crm.insights;
  const fmt = createFmt({ locale: p.locale, timeZone: p.timeZone });
  const kpis: [string, string][] = [];
  if (k.debt) kpis.push([m.kpi.debt, fmt.money(k.debt.due)], [m.kpi.overdue, fmt.money(k.debt.overdue)]);
  if (k.contracts) kpis.push([m.kpi.contracts, interpolate(m.contractValue, { count: k.contracts.active, value: fmt.moneyShort(k.contracts.value) }) + (k.contracts.next_end ? ` · ${interpolate(m.contractEnd, { date: fmt.date(new Date(`${k.contracts.next_end}T00:00:00Z`)) })}` : '')]);
  if (k.ltv !== null) kpis.push([m.kpi.ltv, fmt.money(k.ltv)]);
  const order = k.recent_order ? { title: interpolate(m.orderTitle, { code: k.recent_order.code, amount: fmt.money(k.recent_order.amount) }), status: m.orderStatus[k.recent_order.status as keyof typeof m.orderStatus] ?? k.recent_order.status } : { title: k.recent_order === null ? m.none : '', status: '' };
  const pay = k.recent_payment ? { title: interpolate(m.paymentTitle, { code: k.recent_payment.code, amount: fmt.money(k.recent_payment.amount) }), status: m.paymentKind[k.recent_payment.status as keyof typeof m.paymentKind] ?? k.recent_payment.status } : { title: k.recent_payment === null ? m.none : '', status: '' };
  return {
    insights: { debt: k.debt, contracts: k.contracts, ...(k.recent_order !== undefined ? { recent_order: k.recent_order } : {}), ...(k.recent_payment !== undefined ? { recent_payment: k.recent_payment } : {}), ltv: k.ltv, links },
    kpis,
    recent_order: order,
    recent_payment: pay,
  };
}

export interface CrmAiDto {
  runs: Record<string, { text: string; act: 'kanban' | 'dedupe' | null }>;
  peek: string[];
}

/**
 * `GET /v1/crm/ai`: lượt AI thật trong phạm vi người xem — Owner / `ai.governance` thấy mọi run, người khác chỉ run mình khởi tạo (như
 * runScope). `runs` rỗng khi chưa có phân tích (drawer gửi prompt soạn sẵn qua Trợ lý — TIP-023c); `peek` = tiêu đề ≤ 5 run gần nhất đã xong.
 * Index ai_run (status, started_at DESC).
 */
export async function crmAi(tx: TenantTx, a: AuthzContext): Promise<CrmAiDto> {
  const all = a.isOwner || a.permissions.has('ai.governance');
  const rows = await tx.aiRun.findMany({
    where: { status: 'completed', kind: { in: ['assistant', 'task', 'agent_reply'] }, title: { not: '' }, ...(all ? {} : { initiatedByUserId: a.userId }) },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: 5,
    select: { title: true },
  });
  return { runs: {}, peek: rows.map((r) => r.title) };
}
