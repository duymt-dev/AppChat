// Đọc Marketing (TIP-037, Blueprint §4.4 — shape packages/shared/src/api/marketing.ts): danh sách chiến dịch page + limit (D42; bằng
// trạng thái / kênh trước, sắp xếp created_at, id — bước id-first chỉ đọc index rồi nạp đúng trang), meta màn (KPI / thẻ kênh / lịch gửi /
// A/B / phân khúc / khách chọn tay — tính từ dữ liệu thật, chỉ số không đo được = null), chi tiết + trang người nhận đầu, trang người nhận,
// phân khúc, gợi ý AI. Quyền `campaign.view` ở controller; khách (tên / liên hệ) chỉ hiện khi nằm trong scope CRM người xem.
import { TenantContexts, TenantSql as Prisma, type TenantDbResolver } from '@appchat/db';
import { AppError, can, type AuthzContext, type CampaignAnalysisDto, type CampaignChannel, type CampaignDetailDto, type CampaignDto, type CampaignStatusKey, type RecipientDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { crmScopeSql, type CrmMembers } from '../../crm/public';
import { countsFor } from '../repos/recipients.repo';
import { CHANNEL_CAPS, allowedActions, emptyCounts, statsOf } from './campaign-policy';

export interface MarketingViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}
export interface CampaignFilter {
  status?: string;
  channel?: string;
  q?: string;
}

const MAX_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set(['draft', 'pending_approval', 'approved', 'scheduled', 'running', 'paused', 'completed', 'rejected', 'cancelled']);
type Row = NonNullable<Awaited<ReturnType<TenantTx['campaign']['findUnique']>>>;
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

export class CampaignReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly members: Pick<CrmMembers, 'names'>,
    private readonly now: () => Date,
  ) {}

  private async tx<T>(v: MarketingViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId))).$transaction(fn);
  }

  private async dtos(tx: TenantTx, v: MarketingViewer, rows: Row[], withHistory: boolean): Promise<CampaignDto[]> {
    const counts = await countsFor(tx, rows.map((r) => r.id));
    const accIds = [...new Set(rows.map((r) => r.accountId).filter((x): x is string => !!x))];
    const accounts = new Map((await tx.channelAccount.findMany({ where: { id: { in: accIds } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
    const segIds = [...new Set(rows.flatMap((r) => r.segmentIds))];
    const segs = new Map((await tx.segment.findMany({ where: { id: { in: segIds } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]));
    const audience = await tx.campaignAudience.groupBy({ by: ['campaignId'], where: { campaignId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
    const picked = new Map(audience.map((a) => [a.campaignId, a._count._all]));
    const events = withHistory ? await tx.campaignEvent.findMany({ where: { campaignId: { in: rows.map((r) => r.id) } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [];
    const names = await this.members.names(rows.map((r) => r.approvedByUserId));
    return rows.map((r) => {
      const ch = r.channel as CampaignChannel;
      const content = r.content as CampaignDto['content'];
      const segNames = r.segmentIds.map((id) => segs.get(id)).filter((x): x is string => !!x);
      const n = picked.get(r.id) ?? 0;
      return {
        id: r.id,
        code: r.code,
        name: r.name,
        desc: (content.subject || content.text).slice(0, 80),
        channel: ch,
        kind: r.kind as CampaignDto['kind'],
        source: r.suggestionId ? 'ai' : 'manual',
        status: r.status as CampaignStatusKey,
        version: r.version,
        account_id: r.accountId,
        account_name: r.accountId ? (accounts.get(r.accountId) ?? '') : '',
        segment: [...segNames, ...(n ? [`+${n}`] : [])].join(', '),
        segment_ids: r.segmentIds,
        est_recipients: r.estRecipients,
        est_credits: r.estCredits,
        date: r.createdAt.toISOString(),
        end: iso(r.completedAt) ?? iso(r.scheduledAt) ?? '',
        scheduled_at: iso(r.scheduledAt),
        approved_by: r.approvedByUserId ? (names.get(r.approvedByUserId) ?? '') : null,
        approved_at: iso(r.approvedAt),
        stats: statsOf(counts.get(r.id) ?? emptyCounts(), CHANNEL_CAPS[ch]),
        capabilities: CHANNEL_CAPS[ch],
        content,
        ab: (r.ab as { text_b: string } | null) ?? null,
        send: r.sendMode as CampaignDto['send'],
        history: events.filter((e) => e.campaignId === r.id).map((e) => [e.kind, e.actorName, e.createdAt.toISOString()] as [string, string, string]),
        ...(r.rejectReason ? { reject_reason: r.rejectReason } : {}),
        allowed: can(v.authz, 'campaign.manage') || can(v.authz, 'campaign.approve') ? allowedActions(r.status as CampaignStatusKey).filter((a) => can(v.authz, a === 'campaign.approve' || a === 'campaign.reject' ? 'campaign.approve' : a === 'campaign.recipient_export' ? 'campaign.view' : 'campaign.manage')) : [],
      };
    });
  }

  /** Trang chiến dịch: count + id theo index (bằng trước, created_at / id sau) → nạp đúng trang → giữ thứ tự. */
  async list(v: MarketingViewer, f: CampaignFilter, page = 1, limit = 20) {
    const lim = Math.min(Math.max(1, limit), MAX_LIMIT);
    const pg = Math.max(1, page);
    const where = [Prisma.sql`c.deleted_at IS NULL`];
    if (f.status && STATUSES.has(f.status)) where.push(Prisma.sql`c.status = ${f.status}`);
    if (f.channel === 'zalo' || f.channel === 'email') where.push(Prisma.sql`c.channel = ${f.channel}`);
    if (f.channel === 'auto') where.push(Prisma.sql`c.suggestion_id IS NOT NULL`);
    const q = f.q?.trim().slice(0, 100);
    if (q) where.push(Prisma.sql`(c.name ILIKE ${`%${q}%`} OR c.code ILIKE ${`%${q}%`})`);
    const w = Prisma.join(where, ' AND ');
    return this.tx(v, async (tx) => {
      const [cnt] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM campaign c WHERE ${w}`;
      const n = cnt?.n ?? 0n;
      const ids = await tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM campaign c WHERE ${w} ORDER BY c.created_at DESC, c.id DESC LIMIT ${lim} OFFSET ${(pg - 1) * lim}`;
      const rows = await tx.campaign.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
      const order = new Map(ids.map((r, i) => [r.id, i]));
      rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      const total = Number(n);
      return { data: await this.dtos(tx, v, rows, false), next_cursor: pg * lim < total ? String(pg + 1) : null, meta: { total, page: pg, limit: lim } };
    });
  }

  async get(v: MarketingViewer, id: string): Promise<CampaignDetailDto> {
    return this.tx(v, async (tx) => {
      const r = UUID.test(id) ? await tx.campaign.findUnique({ where: { id } }) : null;
      if (!r || r.deletedAt) throw new AppError('NOT_FOUND', 404, { campaign_id: 'not_found' });
      const [dto] = await this.dtos(tx, v, [r], true);
      const page = await this.recipientPage(tx, v, r.id, undefined, 1, 50);
      return { ...dto!, recipients: page.data, recipients_total: page.meta.total };
    });
  }

  async recipients(v: MarketingViewer, id: string, status: string | undefined, page = 1, limit = 50) {
    return this.tx(v, async (tx) => {
      const r = UUID.test(id) ? await tx.campaign.findUnique({ where: { id }, select: { id: true, deletedAt: true } }) : null;
      if (!r || r.deletedAt) throw new AppError('NOT_FOUND', 404, { campaign_id: 'not_found' });
      return this.recipientPage(tx, v, r.id, status, page, limit);
    });
  }

  /** Trang người nhận (campaign_id, status) bằng → id; khách ngoài scope CRM người xem không ra dòng. */
  private async recipientPage(tx: TenantTx, v: MarketingViewer, campaignId: string, status: string | undefined, page: number, limit: number) {
    const lim = Math.min(Math.max(1, limit), MAX_LIMIT);
    const pg = Math.max(1, page);
    const st = status && /^[a-z_]{1,20}$/.test(status) ? Prisma.sql`AND r.status = ${status}` : Prisma.empty;
    const scope = Prisma.sql`EXISTS (SELECT 1 FROM contact c WHERE c.id = r.contact_id AND c.deleted_at IS NULL AND ${crmScopeSql(v.authz)})`;
    const [cnt] = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM campaign_recipient r WHERE r.campaign_id = ${campaignId}::uuid ${st} AND ${scope}`;
    const n = cnt?.n ?? 0n;
    const rows = await tx.$queryRaw<{ id: string; contact_id: string; conversation_id: string | null; name: string; endpoint: string; status: string; skip_reason: string | null; outcome: string | null; variant: string; sent_at: Date | null; replied_at: Date | null; read_at: Date | null }[]>`
      SELECT r.id, r.contact_id, r.conversation_id, c.name, r.endpoint, r.status, r.skip_reason, r.outcome, r.variant, r.sent_at, r.replied_at, r.read_at
      FROM (SELECT r.id FROM campaign_recipient r WHERE r.campaign_id = ${campaignId}::uuid ${st} AND ${scope} ORDER BY r.id LIMIT ${lim} OFFSET ${(pg - 1) * lim}) p
      JOIN campaign_recipient r ON r.id = p.id JOIN contact c ON c.id = r.contact_id ORDER BY r.id`;
    const total = Number(n);
    const data: RecipientDto[] = rows.map((x) => ({
      id: x.id, contact_id: x.contact_id, conversation_id: x.conversation_id, name: x.name, endpoint: x.endpoint,
      status: x.status as RecipientDto['status'], skip_reason: x.skip_reason as RecipientDto['skip_reason'], outcome: x.outcome as RecipientDto['outcome'],
      variant: x.variant as 'a' | 'b', sent_at: iso(x.sent_at), replied_at: iso(x.replied_at), read_at: iso(x.read_at),
    }));
    return { data, next_cursor: pg * lim < total ? String(pg + 1) : null, meta: { total, page: pg, limit: lim } };
  }

  async segments(v: MarketingViewer) {
    return this.tx(v, async (tx) => {
      const rows = await tx.segment.findMany({ where: { deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 200 });
      return rows.map((s) => ({ id: s.id, name: s.name, filter: s.filter, is_dynamic: s.isDynamic, last_count: s.lastCount, version: s.version, updated_at: s.updatedAt.toISOString() }));
    });
  }

  async suggestions(v: MarketingViewer) {
    return this.tx(v, async (tx) => {
      const rows = await tx.campaignSuggestion.findMany({ where: { status: { not: 'dismissed' } }, orderBy: [{ generatedAt: 'desc' }, { id: 'asc' }], take: 8 });
      return rows.map((s) => ({
        id: s.id, kind: s.kind, status: s.status, title: s.title, reason: s.reason, est_count: s.estCount, best_time: s.bestTime, channel: s.channel,
        filter: s.segmentFilter, subject: s.subject, body: s.body, cta: s.cta, run_id: s.runId, generated_at: s.generatedAt.toISOString(),
      }));
    });
  }

  /** Trạng thái lượt phân tích của CHÍNH người xem (run khác người / không phải campaign.analyze → 404). Chưa có run = đang xếp hàng. */
  async analysis(v: MarketingViewer, runId: string): Promise<CampaignAnalysisDto> {
    if (!UUID.test(runId)) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    return this.tx(v, async (tx) => {
      const run = await tx.aiRun.findUnique({ where: { id: runId }, select: { status: true, title: true, initiatedByUserId: true, error: true } });
      if (run && (run.title !== 'campaign.analyze' || run.initiatedByUserId !== v.userId)) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
      if (!run) {
        const asked = await tx.outboxEvent.findFirst({ where: { topic: 'campaign.analysis_requested', payload: { path: ['run_id'], equals: runId } }, select: { payload: true } });
        if ((asked?.payload as { requested_by?: string } | undefined)?.requested_by !== v.userId) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
        return { run_id: runId, status: 'queued', stored: null, error: null };
      }
      if (run.status === 'failed' || run.status === 'cancelled') return { run_id: runId, status: 'failed', stored: null, error: run.error?.slice(0, 200) ?? 'failed' };
      if (run.status !== 'completed') return { run_id: runId, status: 'running', stored: null, error: null };
      // Run xong → đợi campaign.store_analysis (event `campaign.suggestions_updated`, kể cả 0 gợi ý) rồi mới báo xong.
      const done = await tx.outboxEvent.findFirst({ where: { topic: 'campaign.suggestions_updated', payload: { path: ['run_id'], equals: runId } }, select: { id: true } });
      return done ? { run_id: runId, status: 'completed', stored: await tx.campaignSuggestion.count({ where: { runId } }), error: null } : { run_id: runId, status: 'running', stored: null, error: null };
    });
  }

  /** Meta màn Marketing — số đo thật từ người nhận; chỉ số kênh không hỗ trợ (đọc / click) = null. Nhãn là khoá (FE dịch). */
  async meta(v: MarketingViewer) {
    const now = this.now();
    return this.tx(v, async (tx) => {
      const byStatus = await tx.campaign.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } });
      const cnt = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
      const sent = await tx.$queryRaw<{ channel: string; sent: bigint; replied: bigint; converted: bigint }[]>`
        SELECT c.channel, count(*) FILTER (WHERE r.outcome = 'accepted')::bigint AS sent, count(r.replied_at)::bigint AS replied, count(r.converted_at)::bigint AS converted
        FROM campaign_recipient r JOIN campaign c ON c.id = r.campaign_id WHERE c.deleted_at IS NULL GROUP BY c.channel`;
      const pct = (a: number, b: number) => (b ? `${((a * 100) / b).toFixed(1)}%` : '—');
      const sum = (k: 'sent' | 'replied' | 'converted', ch?: string) => sent.filter((x) => !ch || x.channel === ch).reduce((s, x) => s + Number(x[k]), 0);
      const byChannel = await tx.campaign.groupBy({ by: ['channel'], where: { deletedAt: null }, _count: { _all: true } });
      // Chỉ số đo được từ bằng chứng (DC-240): đã gửi (kênh nhận), phản hồi, chuyển đổi — không có chỉ số mở / click (kênh không xác nhận).
      const hero = (ch: string) => [['campaigns', String(byChannel.find((x) => x.channel === ch)?._count._all ?? 0)], ['sent', String(sum('sent', ch))], ['reply', pct(sum('replied', ch), sum('sent', ch))], ['converted', pct(sum('converted', ch), sum('sent', ch))]] as [string, string][];
      const upcoming = await tx.campaign.findMany({ where: { deletedAt: null, status: { in: ['scheduled', 'approved'] } }, orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }], take: 5 });
      const segments = await tx.segment.findMany({ where: { deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 50, select: { id: true, name: true, lastCount: true } });
      const sugg = await tx.campaignSuggestion.findMany({ where: { status: 'new' }, orderBy: { generatedAt: 'desc' }, take: 4 });
      const customers = await tx.$queryRaw<{ id: string; name: string; phone: string | null; email: string | null; group: string | null; tier_key: string | null }[]>`
        SELECT c.id, c.name, c.phone, c.email, c."group"::text AS group, c.tier_key FROM contact c
        WHERE c.deleted_at IS NULL AND NOT c.marketing_opt_out AND ${crmScopeSql(v.authz)} ORDER BY c.last_interaction_at DESC, c.id LIMIT 200`;
      const accounts = await tx.channelAccount.findMany({ where: { type: { in: ['zalo_personal', 'email'] } }, orderBy: { createdAt: 'asc' }, select: { id: true, type: true, name: true, status: true, settings: true } });
      return {
        now: now.toISOString(),
        kpis: [['running', String(cnt('running')), ''], ['sent', String(sum('sent')), ''], ['reply', pct(sum('replied'), sum('sent')), ''], ['converted', pct(sum('converted'), sum('sent')), '']] as [string, string, string][],
        hero: { email: hero('email'), zalo: hero('zalo'), auto: [] as [string, string][] },
        ab_tests: [] as [string, string, string, string, string][],
        schedule: upcoming.map((c) => [iso(c.scheduledAt) ?? '', c.name, c.channel, String(c.estRecipients)] as [string, string, string, string]),
        ai: sugg.map((s) => [s.title, s.kind, s.reason, s.id] as [string, string, string, string]),
        segments: segments.map((s) => [s.id, s.name, s.lastCount] as [string, string, number]),
        customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone ?? '', email: c.email ?? '', group: c.group ?? '', label: c.tier_key ?? '' })),
        accounts: accounts.map((a) => ({ id: a.id, type: a.type, name: a.name, status: a.status, daily_cap: ((a.settings ?? {}) as { daily_cap?: number }).daily_cap ?? (a.type === 'zalo_personal' ? 200 : null) })),
        signals: ['profile', 'tags', 'orders', 'interactions', 'last_interaction', 'value', 'documents', 'campaigns'],
        pending: cnt('pending_approval'),
      };
    });
  }
}
