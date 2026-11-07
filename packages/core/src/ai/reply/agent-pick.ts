// Chọn agent phục vụ lượt (TIP-022b A + B): agent người gán / chuyển giữ nguyên (không cướp gán tay); chưa có → phân luồng từ khoá của tài
// khoản (opt-in) rồi agent mặc định của tài khoản; ứng viên phải đang chạy + đã xuất bản + loại kênh cho phép + trong giờ (giao lịch tài
// khoản ∩ lịch agent). Ứng viên tra theo danh sách id đã cấu hình (≤ 25) — không quét toàn bộ agent của tenant.
import type { TenantDb } from '@appchat/db';
import { settingsOf } from '../../channels/public';
import { scheduleOf } from '../agents/schedule-config';
import { availability, type Availability } from './availability';
import { routeByKeyword } from './keyword-router';
import { publishedAgent } from './reply-context';

type Conv = NonNullable<Awaited<ReturnType<TenantDb['conversation']['findUnique']>>>;
type Published = NonNullable<Awaited<ReturnType<typeof publishedAgent>>>;

export interface Pick {
  agent: Published | null;
  source: 'auto' | 'manual' | 'transfer';
  reason: string;
  /** Agent đã xác định nhưng ngoài giờ — hội thoại chờ nhân viên kèm mốc mở kế tiếp. */
  closed: Availability | null;
}

const typeAllowed = (a: Published, channelType: string) => !a.cfg.channels.length || a.cfg.channels.includes(channelType);

/** Agent đã cố định cho hội thoại (người gán / chuyển / lượt trước): không phân luồng lại, chỉ kiểm còn chạy + giờ. */
async function fixedAgent(db: TenantDb, c: Conv, accountSchedule: ReturnType<typeof scheduleOf>, agentId: string, source: Pick['source'], now: Date): Promise<Pick> {
  const a = await publishedAgent(db, agentId);
  if (!a || !typeAllowed(a, c.channelType)) return { agent: null, source, reason: 'unavailable', closed: null };
  const av = availability(a.cfg, accountSchedule, now);
  return av.open ? { agent: a, source, reason: source, closed: null } : { agent: null, source, reason: 'out_of_hours', closed: av };
}

/** `binding`: nguồn gán đã lưu ở receipt lượt (giữ nguyên qua retry / restart). */
export async function pickAgent(db: TenantDb, c: Conv, text: string, now: Date, binding?: { agentId: string | null; source: Pick['source'] } | null): Promise<Pick> {
  const acc = await db.channelAccount.findUnique({ where: { id: c.channelAccountId }, select: { settings: true } });
  const st = acc ? settingsOf(acc) : null;
  const accountSchedule = scheduleOf(st?.schedule ?? null);
  if (binding?.agentId) return fixedAgent(db, c, accountSchedule, binding.agentId, binding.source, now);
  // Người gán agent cho hội thoại (`conversation.assign`) hoặc agent đã nhận từ lượt trước → giữ.
  if (c.assigneeAgentId) return fixedAgent(db, c, accountSchedule, c.assigneeAgentId, 'manual', now);
  const routing = st?.routing;
  const ids = [...new Set([...(routing?.enabled ? routing.candidates.map((x) => x.agent_id) : []), ...(st?.agent_id ? [st.agent_id] : [])])].slice(0, 26);
  const loaded = new Map<string, Published>();
  let closed: Availability | null = null;
  for (const id of ids) {
    const a = await publishedAgent(db, id);
    if (!a || !typeAllowed(a, c.channelType)) continue;
    const av = availability(a.cfg, accountSchedule, now);
    if (av.open) loaded.set(id, a);
    else closed ??= av;
  }
  const d = routeByKeyword(text, routing, st?.agent_id || null, (id) => loaded.has(id));
  if (d.agentId) return { agent: loaded.get(d.agentId)!, source: 'auto', reason: d.reason, closed: null };
  return { agent: null, source: 'auto', reason: closed ? 'out_of_hours' : 'none', closed };
}
