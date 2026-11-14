// Mock Marketing (Blueprint §4.4 marketing, TIP-037): GET /campaigns?status=&channel=&q=&page=&limit=, /campaigns/meta, /campaigns/:id,
// /campaigns/:id/recipients, /segments, /campaign-suggestions, /campaign-analyses/:run_id — cùng DTO với server (marketing-seed.ts).
// draft → pending_approval → (approve) approved | scheduled → running; pause / resume / cancel; delete chỉ draft / rejected / cancelled.
// Mock không gửi tin thật: duyệt "gửi ngay" chuyển sang Đang chạy với người nhận đang chờ (worker server mới gửi).
import { ApiRequestError, CAMPAIGN_DELETABLE, CAMPAIGN_EDITABLE, CAMPAIGN_FLOW, allowedActions, type CampaignStatusKey } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';
import { marketingExtraHandlers } from './marketing-extras';
import { mockMailSenders, mockSenderOf } from './tenant-mail';
import { ACCOUNTS, CUSTOMERS, NOW, SEGMENTS, SIGNALS, accountOf, seedCampaigns, seedSuggestions, type MockCampaign, type MockSuggestion } from './marketing-seed';

export interface MarketingState {
  campaigns: MockCampaign[];
  suggestions: MockSuggestion[];
  /** Lô nhập danh sách (campaign.audience_import) → id khách. */
  batches: Record<string, string[]>;
  /** Lượt phân tích: số lần hỏi trạng thái trước khi xong (mô phỏng worker). */
  analyses: Record<string, number>;
  seq: number;
}

export const createMarketingState = (): MarketingState => ({ campaigns: seedCampaigns(), suggestions: seedSuggestions(), batches: {}, analyses: {}, seq: 2200 });

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
const ME = 'Trâm';

/** Nút theo trạng thái — cùng luật server (campaign-policy.allowedActions). */
const allowedOf = (s: CampaignStatusKey) => {
  const ids = allowedActions(CAMPAIGN_FLOW, s).filter((a) => !a.includes(':') && !['campaign.schedule', 'campaign.start', 'campaign.complete'].includes(a));
  if (CAMPAIGN_EDITABLE.includes(s) || s === 'pending_approval') ids.push('campaign.send_test');
  if (CAMPAIGN_DELETABLE.includes(s)) ids.push('campaign.delete');
  if (['running', 'paused', 'completed', 'cancelled'].includes(s)) ids.push('campaign.recipient_export', 'campaign.resend_unread');
  return [...new Set(ids)];
};
/** DTO công khai: bỏ trường nội bộ của mock (người nhận đầy đủ, cờ xoá, gợi ý nguồn, người tạo). */
const dto = (m: MockCampaign) => {
  const c: Partial<MockCampaign> = { ...m };
  delete c.recipients;
  delete c.deleted;
  delete c.suggestion_id;
  delete c.created_by;
  return { ...(c as Omit<MockCampaign, 'recipients' | 'deleted' | 'suggestion_id' | 'created_by'>), allowed: allowedOf(m.status) };
};

export const findCampaign = (db: MockDb, id: string) => {
  const c = db.marketing.campaigns.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};
export const need = (c: MockCampaign, ...st: CampaignStatusKey[]) => {
  if (!st.includes(c.status)) throw new ApiRequestError(409, { code: 'INVALID_TRANSITION', message: `${c.code}: ${c.status}` });
};
export const logEvent = (c: MockCampaign, kind: string, by = ME) => {
  c.history.push([kind, by, NOW]);
  c.version += 1;
};

export const marketingRoutes: Record<string, MockRoute> = {
  '/campaigns': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.marketing.campaigns.filter(
      (c) =>
        !c.deleted &&
        (!p.status || p.status === 'all' || c.status === p.status) &&
        (!p.channel || p.channel === 'all' || (p.channel === 'auto' ? c.source === 'ai' : c.channel === p.channel)) &&
        (!q || [c.name, c.code].some((v) => norm(v).includes(q))),
    );
    return paginate(rows.map(dto), p);
  },
  '/campaigns/mail-senders': (db) => mockMailSenders(db),
  '/campaigns/meta': (db) => {
    const live = db.marketing.campaigns.filter((c) => !c.deleted);
    const sum = (k: 'sent' | 'replied' | 'converted', ch?: string) => live.filter((c) => !ch || c.channel === ch).reduce((s, c) => s + c.stats[k], 0);
    const pct = (a: number, b: number) => (b ? `${((a * 100) / b).toFixed(1)}%` : '—');
    const hero = (ch: string): [string, string][] => [
      ['campaigns', String(live.filter((c) => c.channel === ch).length)],
      ['sent', String(sum('sent', ch))],
      ['reply', pct(sum('replied', ch), sum('sent', ch))],
      ['converted', pct(sum('converted', ch), sum('sent', ch))],
    ];
    const upcoming = live.filter((c) => c.status === 'scheduled' || c.status === 'approved').sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
    return {
      now: NOW,
      kpis: [
        ['running', String(live.filter((c) => c.status === 'running').length), ''],
        ['sent', String(sum('sent')), ''],
        ['reply', pct(sum('replied'), sum('sent')), ''],
        ['converted', pct(sum('converted'), sum('sent')), ''],
      ],
      hero: { email: hero('email'), zalo: hero('zalo'), auto: [] },
      ab_tests: [],
      schedule: upcoming.slice(0, 5).map((c) => [c.scheduled_at ?? '', c.name, c.channel, String(c.est_recipients)]),
      ai: db.marketing.suggestions.filter((s) => s.status === 'new').slice(0, 4).map((s) => [s.title, s.kind, s.reason, s.id]),
      segments: SEGMENTS.map((s) => [s.id, s.name, s.last_count]),
      customers: CUSTOMERS,
      accounts: ACCOUNTS,
      signals: SIGNALS,
      pending: live.filter((c) => c.status === 'pending_approval').length,
    };
  },
  '/segments': () => SEGMENTS.map((s) => ({ id: s.id, name: s.name, filter: s.filter, is_dynamic: s.is_dynamic, last_count: s.last_count, version: s.version, updated_at: s.updated_at })),
  '/campaign-suggestions': (db) => db.marketing.suggestions.filter((s) => s.status !== 'dismissed'),
};

export const marketingParamRoute = (path: string): MockRoute | undefined => {
  const rec = path.match(/^\/campaigns\/([^/]+)\/recipients$/);
  if (rec)
    return (db, p) => {
      const c = findCampaign(db, rec[1]!);
      return paginate(c.recipients.filter((r) => !p.status || r.status === p.status), { ...p, page: p.page ?? 1, limit: p.limit ?? 50 });
    };
  const an = path.match(/^\/campaign-analyses\/([^/]+)$/);
  if (an)
    return (db) => {
      const id = an[1]!;
      const left = db.marketing.analyses[id];
      if (left === undefined) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
      db.marketing.analyses[id] = Math.max(0, left - 1);
      const stored = db.marketing.suggestions.filter((s) => s.status === 'new').length;
      return left > 0 ? { run_id: id, status: left > 1 ? 'queued' : 'running', stored: null, error: null } : { run_id: id, status: 'completed', stored, error: null };
    };
  const m = path.match(/^\/campaigns\/([^/]+)$/);
  if (!m || m[1] === 'meta') return undefined;
  return (db) => {
    const c = findCampaign(db, m[1]!);
    return { ...dto(c), recipients: c.recipients.slice(0, 50), recipients_total: c.recipients.length };
  };
};

type CreateIn = {
  name: string;
  kind?: MockCampaign['kind'];
  channel: 'zalo' | 'email';
  account_id?: string;
  sender?: { kind: string; account_id?: string; connection_id?: string; sender_id?: string };
  segment_ids?: string[];
  contact_ids?: string[];
  audience_batch_id?: string;
  content: MockCampaign['content'];
  ab?: { text_b: string };
  send?: MockCampaign['send'];
  scheduled_at?: string;
  suggestion_id?: string;
};

/** Người nhận ước tính: phân khúc (lần đếm gần nhất) + khách chọn tay + lô nhập + gợi ý AI nguồn. */
export const estimate = (db: MockDb, i: Pick<CreateIn, 'segment_ids' | 'contact_ids' | 'audience_batch_id' | 'suggestion_id'>) =>
  (i.segment_ids ?? []).reduce((s, id) => s + (SEGMENTS.find((x) => x.id === id)?.last_count ?? 0), 0) +
  new Set([...(i.contact_ids ?? []), ...(i.audience_batch_id ? (db.marketing.batches[i.audience_batch_id] ?? []) : [])]).size +
  (db.marketing.suggestions.find((s) => s.id === i.suggestion_id)?.est_count ?? 0);

const control = (to: CampaignStatusKey, from: CampaignStatusKey[], kind: string): MockHandler => ({
  execute: (db, i: { campaign_id: string }) => {
    const c = findCampaign(db, i.campaign_id);
    need(c, ...from);
    c.status = to;
    logEvent(c, kind);
    return { campaign_id: c.id, status: c.status, version: c.version };
  },
});

export const marketingHandlers: Record<string, MockHandler> = {
  'campaign.suggest': {
    execute: (db) => ({ suggestions: db.marketing.suggestions.filter((s) => s.status === 'new').map((s) => ({ id: s.id, title: s.title, est_count: s.est_count })) }),
  },
  'campaign.create': {
    execute: (db, i: CreateIn) => {
      const n = ++db.marketing.seq;
      const est = estimate(db, i);
      const acc = accountOf(i.channel);
      const sender = mockSenderOf(db, i.channel, i.sender);
      if (i.sender?.kind === 'tenant_mail' && !sender) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'sender', fields: { sender: 'not_found' } });
      const sugg = db.marketing.suggestions.find((s) => s.id === i.suggestion_id);
      const segs = (i.segment_ids ?? []).map((id) => SEGMENTS.find((x) => x.id === id)?.name ?? id);
      const c: MockCampaign = {
        ...seedCampaigns()[0]!,
        id: `cp_${n}`,
        code: `CD-${n}`,
        name: i.name,
        desc: (i.content.subject || i.content.text).slice(0, 80),
        channel: i.channel,
        kind: i.kind ?? sugg?.kind ?? 'manual',
        source: sugg ? 'ai' : 'manual',
        status: 'draft',
        version: 1,
        account_id: acc.id,
        account_name: acc.name,
        ...(sender ? { sender } : {}),
        segment: [...segs, ...(sugg ? [sugg.title] : []), ...(i.contact_ids?.length ? [`+${i.contact_ids.length}`] : [])].join(', '),
        segment_ids: i.segment_ids ?? [],
        est_recipients: est,
        date: NOW,
        end: i.scheduled_at ?? '',
        scheduled_at: i.send !== 'now' ? (i.scheduled_at ?? null) : null,
        approved_by: null,
        approved_at: null,
        stats: { eligible: 0, sent: 0, skipped: 0, failed: 0, unknown: 0, replied: 0, converted: 0, open: null, click: null, progress: 0, revenue: '0' },
        content: i.content,
        ab: i.ab ?? null,
        send: i.send ?? 'now',
        history: [['created', ME, NOW]],
        recipients: [],
        suggestion_id: sugg?.id ?? null,
      };
      db.marketing.campaigns.unshift(c);
      if (sugg) sugg.status = 'used';
      return { campaign_id: c.id, code: c.code, est_recipients: est, est_credits: 0 };
    },
    undo: (db) => {
      const c = db.marketing.campaigns.shift();
      const s = db.marketing.suggestions.find((x) => x.id === c?.suggestion_id);
      if (s) s.status = 'new';
    },
  },
  'campaign.update': {
    execute: (db, i: Partial<CreateIn> & { campaign_id: string; if_version?: number }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'draft', 'rejected');
      if (i.if_version !== undefined && i.if_version !== c.version) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: c.code });
      c.status = 'draft';
      if (i.name) c.name = i.name;
      if (i.content) c.content = i.content;
      if (i.scheduled_at) c.scheduled_at = i.scheduled_at;
      logEvent(c, 'edited');
      return { campaign_id: c.id, status: c.status, version: c.version };
    },
  },
  'campaign.submit': {
    execute: (db, i: { campaign_id: string }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'draft', 'rejected');
      if (!c.est_recipients) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'audience', fields: { audience: 'empty' } });
      c.status = 'pending_approval';
      c.stats.eligible = c.est_recipients;
      logEvent(c, 'submitted');
      return { campaign_id: c.id, status: c.status, version: c.version, eligible: c.est_recipients };
    },
    undo: (db, i: { campaign_id: string }) => {
      const c = db.marketing.campaigns.find((x) => x.id === i.campaign_id);
      if (c) c.status = 'draft';
    },
  },
  'campaign.approve': {
    execute: (db, i: { campaign_id: string }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'pending_approval');
      c.status = c.scheduled_at ? 'scheduled' : 'approved';
      c.approved_by = ME;
      c.approved_at = NOW;
      logEvent(c, 'approved');
      return { campaign_id: c.id, status: c.status, version: c.version, recipients: c.stats.eligible };
    },
    preview: (db, i: { campaign_id: string }) => {
      const c = findCampaign(db, i.campaign_id);
      return { summary: `${c.code} · ${c.name}`, count: c.stats.eligible || c.est_recipients };
    },
  },
  'campaign.reject': {
    execute: (db, i: { campaign_id: string; reason: string }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'pending_approval');
      c.status = 'rejected';
      c.reject_reason = i.reason;
      logEvent(c, 'rejected');
      return { campaign_id: c.id, status: c.status, version: c.version };
    },
  },
  'campaign.pause': control('paused', ['running', 'scheduled', 'approved'], 'paused'),
  'campaign.cancel': control('cancelled', ['draft', 'pending_approval', 'approved', 'scheduled', 'running', 'paused'], 'cancelled'),
  'campaign.resume': {
    execute: (db, i: { campaign_id: string }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'paused');
      c.status = c.stats.sent ? 'running' : c.scheduled_at ? 'scheduled' : 'approved';
      logEvent(c, 'resumed');
      return { campaign_id: c.id, status: c.status, version: c.version };
    },
  },
  'campaign.delete': {
    execute: (db, i: { campaign_id: string }) => {
      const c = findCampaign(db, i.campaign_id);
      need(c, 'draft', 'rejected', 'cancelled');
      c.deleted = true;
      return { campaign_id: c.id };
    },
  },
  ...marketingExtraHandlers,
};
