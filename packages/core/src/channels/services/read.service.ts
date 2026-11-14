// Đọc trang Cài đặt › Kênh kết nối (Blueprint §4.4 channels, REQ-B09 / B11; shape packages/shared/src/api/channels.ts):
// nhóm theo loại kênh của registry (16 thẻ, đúng thứ tự prototype), mỗi loại có `accounts[]`; trạng thái gộp = tài khoản kém
// nhất, hội thoại cộng dồn; hiệu suất 7 ngày từ `channel_account_stat_daily`; trạng thái đăng nhập QR.
import { AppError, type ChannelAccountDto, type ChannelLoginStateDto, type SettingsChannelDto } from '@appchat/shared';
import type { ChannelRegistry } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import { ChannelAccounts, UUID, settingsOf, type AccountHealth, type AccountRow } from './accounts.service';
import type { ChannelControl } from './control';
import { qrImageOf } from './login-attempt';
import { bindingVersion } from './binding-version';


type Health = ChannelAccountDto['health'];
type RuleLite = { id: string; channelAccountId: string | null; enabled: boolean; mode: string; version: number };

/** Chia lead đang áp cho tài khoản (TIP-042b): ghi đè → mặc định → chưa cấu hình (hàng chung). */
function routingOf(rules: RuleLite[], accountId: string): NonNullable<ChannelAccountDto['routing']> {
  const own = rules.find((x) => x.channelAccountId === accountId);
  const r = own ?? rules.find((x) => x.channelAccountId === null);
  return r ? { source: own ? 'account' : 'default', rule_id: r.id, enabled: r.enabled, mode: r.mode, version: r.version } : { source: 'none', rule_id: null, enabled: false, mode: 'manual', version: 0 };
}
const RANK: Record<Health, number> = { down: 0, off: 1, slow: 2, good: 3 };

/** Sức khoẻ FE (good | slow | down | off) từ trạng thái tài khoản (Blueprint §2.2) + health của phiên. */
export function healthOf(row: Pick<AccountRow, 'status' | 'pausedAt' | 'health'>): Health {
  if (row.pausedAt || row.status === 'pending' || row.status === 'disconnected') return 'off';
  if (row.status === 'connecting') return 'slow';
  if (row.status !== 'connected') return 'down';
  return (row.health as AccountHealth).status === 'degraded' ? 'slow' : 'good';
}

/** Giây → `1'12` như prototype; chưa có mẫu → `—`. */
export const fmtFrt = (sec: number | null): string => (sec === null ? '—' : `${Math.floor(sec / 60)}'${String(Math.round(sec % 60)).padStart(2, '0')}`);

export interface AgentNames {
  /** Tên AI Agent theo id (bảng `ai_agent` — TIP-021). Chưa có thì trả map rỗng → FE hiện id rỗng. */
  names(db: TenantDb, ids: string[]): Promise<Map<string, string>>;
}

export const NO_AGENTS: AgentNames = { names: async () => new Map() };

const day0 = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export class ChannelsReadService {
  constructor(
    private readonly registry: ChannelRegistry,
    private readonly accounts: ChannelAccounts,
    private readonly control: ChannelControl | null,
    private readonly agents: AgentNames,
    private readonly now: () => Date,
  ) {}

  async list(db: TenantDb, filter: 'all' | 'on' | 'off'): Promise<SettingsChannelDto[]> {
    const rows = await db.channelAccount.findMany({ where: { status: { not: 'disconnected' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    const stats = await this.totals(db, rows.map((r) => r.id));
    const agentIds = [...new Set(rows.map((r) => settingsOf(r).agent_id).filter((x): x is string => !!x))];
    const names = agentIds.length ? await this.agents.names(db, agentIds) : new Map<string, string>();
    const rules = await db.leadRoutingRule.findMany({ select: { id: true, channelAccountId: true, enabled: true, mode: true, version: true } });
    const out = this.registry.manifests().map((m): SettingsChannelDto => {
      const accounts = rows.filter((r) => r.type === m.type).map((r) => ({ ...this.account(r, stats.get(r.id), names), routing: routingOf(rules, r.id) }));
      const on = accounts.filter((a) => a.connected);
      const worst = on.reduce<ChannelAccountDto | null>((w, a) => (!w || RANK[a.health] < RANK[w.health] ? a : w), null);
      const ops = Object.entries(m.capabilities.operations ?? {})
        .filter(([, mode]) => mode && mode !== 'unsupported')
        .map(([k]) => k);
      return {
        type: m.type,
        name: m.display.name,
        short: m.display.short,
        color: m.display.color,
        group: m.display.group,
        label: m.display.label,
        available: this.registry.isConnectable(m.type),
        accounts,
        connected: on.length > 0,
        health: worst?.health ?? 'off',
        convs: on.reduce((n, a) => n + a.convs, 0),
        frt: worst?.frt ?? '—',
        account: accounts[0]?.name ?? '',
        agent: accounts[0]?.agent ?? '',
        connect: { kind: m.connect.kind, risk_notice: m.connect.riskNotice ?? null },
        capabilities: {
          inbound: m.capabilities.direct || m.capabilities.group,
          outbound: m.capabilities.send.length > 0,
          groups: m.capabilities.group,
          reactions: m.capabilities.reactions,
          operations: ops,
        },
      };
    });
    return out.filter((c) => filter === 'all' || (filter === 'on' ? c.connected : !c.connected));
  }

  /** Hiệu suất `days` ngày gần nhất (REQ-B11), ngày không có dữ liệu = 0. */
  async stats(db: TenantDb, accountId: string, days: number) {
    const row = await this.accounts.live(db, accountId);
    const n = Math.min(Math.max(Math.trunc(days) || 7, 1), 31);
    const from = new Date(day0(this.now()).getTime() - (n - 1) * 86_400_000);
    const got = await db.channelAccountStatDaily.findMany({ where: { channelAccountId: row.id, day: { gte: from } } });
    const byDay = new Map(got.map((s) => [s.day.toISOString().slice(0, 10), s]));
    const out = Array.from({ length: n }, (_, i) => {
      const s = byDay.get(new Date(from.getTime() + i * 86_400_000).toISOString().slice(0, 10));
      return { day: i, convs: s?.convs ?? 0, frt_sec: s && s.frtCount ? Math.round(Number(s.frtSum) / s.frtCount) : 0 };
    });
    return { account_id: row.id, days: out, total_convs: out.reduce((t, d) => t + d.convs, 0) };
  }

  /** Ảnh QR của đúng lần đăng nhập đang chờ (khối `qr` của Trợ lý — TIP-023c): lần khác / hết hạn → 404. */
  async loginQr(db: TenantDb, accountId: string, attempt: string) {
    return qrImageOf(db, this.control, accountId, attempt);
  }

  /** Trạng thái QR: Redis (worker ghi) — hết TTL thì suy từ trạng thái tài khoản. */
  async login(db: TenantDb, accountId: string): Promise<ChannelLoginStateDto> {
    const row = UUID.test(accountId) ? await db.channelAccount.findUnique({ where: { id: accountId } }) : null;
    if (!row || row.status === 'disconnected') throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
    const s = await this.control?.login(row.id);
    if (s) return s;
    const status = row.status === 'connected' ? 'connected' : row.status === 'expired' ? 'expired' : row.status === 'connecting' ? 'starting' : 'failed';
    return { account_id: row.id, status, qr: null, expires_at: null };
  }

  private account(r: AccountRow, s: { convs: number; frt: number | null } | undefined, names: Map<string, string>): ChannelAccountDto {
    const st = settingsOf(r);
    return {
      id: r.id,
      name: r.name,
      connected: r.status === 'connected',
      convs: s?.convs ?? 0,
      frt: fmtFrt(s?.frt ?? null),
      health: healthOf(r),
      agent: st.agent_id ? (names.get(st.agent_id) ?? '') : '',
      ...(st.agent_id ? { agent_id: st.agent_id } : {}),
      ai_mode: st.ai_mode,
      hours: st.hours,
      greeting: st.greeting,
      assign_mode: st.assign_mode,
      sla_policy: st.sla_policy,
      ...(st.sla_override ? { sla_override: st.sla_override } : {}),
      sync_messages: st.sync_messages,
      sync_auto_create_contact: st.sync_auto_create_contact,
      history_days: st.history_days,
      paused: !!r.pausedAt,
      status: r.status,
      agent_behavior: { schedule: st.schedule ?? null, routing: st.routing ?? { enabled: false, candidates: [] }, greeting_enabled: !!st.greeting_enabled },
      binding_version: bindingVersion(r.settings),
      ...this.limits(r.type, st),
    };
  }

  /** Tốc độ / trần ngày đang áp (TIP-037): cài đặt tài khoản thắng, vắng → manifest (send.processor đọc cùng thứ tự). */
  private limits(type: string, st: ReturnType<typeof settingsOf>) {
    const rl = this.registry.manifests().find((m) => m.type === type)?.rateLimit;
    if (!rl) return {};
    const capDefault = rl.perDayProactive ?? null;
    return { rate_per_minute: st.rate_per_minute ?? rl.perMinute, daily_cap: st.daily_cap ?? capDefault, rate_default: rl.perMinute, daily_cap_default: capDefault };
  }

  /** Hội thoại + FRT 30 ngày gần nhất mỗi tài khoản (một truy vấn gộp theo PK `(channel_account_id, day)`). */
  private async totals(db: TenantDb, ids: string[]) {
    const out = new Map<string, { convs: number; frt: number | null }>();
    if (!ids.length) return out;
    const from = new Date(day0(this.now()).getTime() - 29 * 86_400_000);
    const g = await db.channelAccountStatDaily.groupBy({ by: ['channelAccountId'], where: { channelAccountId: { in: ids }, day: { gte: from } }, _sum: { convs: true, frtSum: true, frtCount: true } });
    for (const x of g) {
      const cnt = x._sum.frtCount ?? 0;
      out.set(x.channelAccountId, { convs: x._sum.convs ?? 0, frt: cnt ? Number(x._sum.frtSum ?? 0) / cnt : null });
    }
    return out;
  }
}
