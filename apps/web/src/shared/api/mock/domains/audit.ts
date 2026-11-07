// Mock Audit log + AI Audit log (TIP-045b A2) cùng hợp đồng API (packages/shared/src/api/audit.ts): không tham số → mảng; `page=1` /
// `cursor` / lọc → trang `{ data, next_cursor }` created_at DESC. Dữ liệu = dòng prototype (fixture settings.json) chuyển sang DTO —
// `action` giữ chữ prototype (nhãn hiển thị), `action_id` = action tương ứng để lọc; giờ là giờ VN của ngày mẫu.
import { AUDIT_PAGE_SIZE, type AiAuditRowDto, type AuditRowDto } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockRoute } from '../routes';

const DAY = '2026-10-30';
const at = (hm: string) => new Date(`${DAY}T${hm.length === 5 ? `${hm}:00` : hm}+07:00`).toISOString();
const id = (p: string, i: number) => `0190f000-0000-7000-8000-${p}${String(i).padStart(10, '0')}`;
/** Action tương ứng của từng dòng prototype (theo thứ tự fixture) — chỉ để lọc. */
const AUDIT_IDS = ['inbox.routing_update', 'member.invite', 'integration.refresh', 'contact.export', 'conversation.assign', 'member.set_role', 'channel.email.connect'];
const SECURITY = new Set(['member.invite', 'contact.export', 'member.set_role', 'channel.email.connect']);

const audit: (AuditRowDto & { security: boolean })[] = fixture.audit.map((a, i) => ({
  id: id('aa', i),
  time: at(a.time),
  name: a.name,
  role: a.role,
  actor_id: a.name ? id('bb', i) : null,
  action_id: AUDIT_IDS[i] ?? 'workspace.update',
  action: a.action,
  source: a.role === 'ai' ? 'assistant' : a.role === 'system' ? 'system' : 'ui',
  status: 'ok',
  ip: a.ip,
  trace_id: null,
  security: SECURITY.has(AUDIT_IDS[i] ?? ''),
}));

const ai: AiAuditRowDto[] = fixture.ai_audit.map((l, i) => ({
  id: id('cc', i),
  time: at(l.time),
  actor: l.actor,
  agent_name: null,
  action: l.action,
  context: l.context,
  tier: 'standard',
  credits: 0,
  tokens: 0,
  status: l.status as AiAuditRowDto['status'],
  trace_id: null,
}));

type P = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

function page<T extends { id: string; time: string; status: string }>(rows: T[], p: P, match: (r: T) => boolean) {
  const paged = Object.keys(p).some((k) => p[k] !== undefined && p[k] !== '');
  const from = str(p.from);
  const to = str(p.to);
  const st = str(p.status);
  const all = rows.filter((r) => match(r) && (!st || r.status === st) && (!from || r.time >= from) && (!to || r.time < to));
  if (!paged) return all;
  const cur = str(p.cursor);
  const start = cur ? all.findIndex((r) => r.id === cur) + 1 : 0;
  const data = all.slice(start, start + AUDIT_PAGE_SIZE);
  return { data, next_cursor: start + AUDIT_PAGE_SIZE < all.length ? data.at(-1)!.id : null };
}

export const auditRoutes: Record<string, MockRoute> = {
  '/settings/audit': (_db, p) => {
    const act = str(p.action);
    const actor = str(p.actor);
    const out = page(audit, p, (r) => (!act || (act === 'security' ? r.security : r.action_id === act)) && (!actor || r.actor_id === actor));
    const strip = (r: (typeof audit)[number]): AuditRowDto => {
      const { security: _s, ...dto } = r;
      return dto;
    };
    return Array.isArray(out) ? out.map(strip) : { ...out, data: out.data.map(strip) };
  },
  '/settings/ai-audit': (_db, p) => {
    const actor = str(p.actor);
    return page(ai, p, (r) => !actor || r.actor === actor);
  },
};
