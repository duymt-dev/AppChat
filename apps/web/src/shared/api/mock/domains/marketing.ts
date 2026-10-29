// Mock Marketing (Blueprint §4.4 marketing): GET /campaigns?status=&channel=&q=, /campaigns/meta, /campaigns/:id, /campaign-suggestions.
// Dữ liệu = prototype CAMP L8730 (fixture sinh bởi tools/scripts/fixtures/gen-marketing.py). Kênh chỉ Zalo cá nhân + Email.
// draft → pending_approval → (approve) scheduled | running; pause / resume / cancel; delete chỉ draft / rejected / cancelled.
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/marketing.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.campaigns)[number];
export type CampaignStatus =
  | 'draft' | 'pending_approval' | 'scheduled' | 'running' | 'paused' | 'completed' | 'rejected' | 'cancelled';
export type Campaign = Omit<Fixed, 'status' | 'content' | 'send' | 'history'> & {
  status: CampaignStatus;
  content: { text: string; subject?: string; cta?: string };
  send: string;
  history: string[][];
  reject_reason?: string;
  deleted?: boolean;
};

export interface MarketingState {
  campaigns: Campaign[];
  seq: number;
  used_suggestions: string[];
}

export const createMarketingState = (): MarketingState => ({
  campaigns: structuredClone(fixture.campaigns) as Campaign[],
  seq: 2100 + fixture.campaigns.length,
  used_suggestions: [],
});

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
const SEG = Object.fromEntries(fixture.segments.map(([k, l, n]) => [k, { label: l as string, count: n as number }]));
const STAMP = '24/06 · 09:00';
const ME = 'Trâm';

const find = (db: MockDb, id: string) => {
  const c = db.marketing.campaigns.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};
const need = (c: Campaign, ...st: CampaignStatus[]) => {
  if (!st.includes(c.status)) throw new ApiRequestError(409, { code: 'INVALID_STATE', message: `${c.code}: ${c.status}` });
};
const log = (c: Campaign, kind: string, by = ME) => c.history.push([kind, by, STAMP]);

export const marketingRoutes: Record<string, MockRoute> = {
  '/campaigns': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.marketing.campaigns.filter(
      (c) =>
        !c.deleted &&
        (!p.status || p.status === 'all' || c.status === p.status) &&
        (!p.channel || p.channel === 'all' || (p.channel === 'auto' ? c.source === 'ai' : c.channel === p.channel)) &&
        (!q || [c.name, c.desc, c.code].some((v) => norm(v).includes(q))),
    );
    return paginate(rows, p);
  },
  '/campaigns/meta': (db) => ({
    now: fixture.now,
    kpis: fixture.kpis,
    hero: fixture.hero,
    ab_tests: fixture.ab_tests,
    schedule: fixture.schedule,
    ai: fixture.ai,
    segments: fixture.segments,
    customers: fixture.customers,
    signals: fixture.signals,
    pending: db.marketing.campaigns.filter((c) => !c.deleted && c.status === 'pending_approval').length,
  }),
  '/campaign-suggestions': (db) => ({
    data: fixture.suggestions.map((s) => ({ ...s, used: db.marketing.used_suggestions.includes(s.id) })),
  }),
};

export const marketingParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/campaigns\/(cp_[^/]+)$/);
  if (!m) return undefined;
  return (db) => ({ ...find(db, m[1]!), recipients: fixture.recipients });
};

type CreateIn = {
  name: string;
  kind?: string;
  channel: 'zalo' | 'email';
  segment_ids?: string[];
  contact_ids?: string[];
  content: { text: string; subject?: string; cta?: string };
  send?: string;
  scheduled_at?: string;
  suggestion_id?: string;
};

const audience = (i: { segment_ids?: string[]; contact_ids?: string[] }) =>
  (i.segment_ids ?? []).reduce((s, k) => s + (SEG[k]?.count ?? 0), 0) + (i.contact_ids?.length ?? 0);

export const marketingHandlers: Record<string, MockHandler> = {
  'segment.preview': {
    execute: (_db, i: { segment_ids: string[] }) => {
      const count = audience(i);
      return { count, reachable: Math.round(count * 0.94) };
    },
  },
  'campaign.suggest': {
    execute: () => ({ suggestions: fixture.suggestions.map((s) => ({ id: s.id, title: s.name, est_count: s.count })) }),
  },
  'campaign.create': {
    execute: (db, i: CreateIn) => {
      const n = ++db.marketing.seq;
      const est = audience(i);
      const seg = (i.segment_ids ?? []).map((k) => SEG[k]?.label ?? k).join(', ');
      const c: Campaign = {
        id: `cp_${n}`,
        code: `CD-${n}`,
        name: i.name,
        desc: i.content.subject ?? i.content.text.slice(0, 60),
        channel: i.channel,
        kind: i.kind ?? 'manual',
        source: i.suggestion_id ? 'ai' : 'manual',
        status: 'draft',
        segment: seg || `${i.contact_ids?.length ?? 0} khách chọn tay`,
        est_recipients: est,
        date: '24/06',
        end: i.send === 'schedule' && i.scheduled_at ? i.scheduled_at : 'Không thời hạn',
        stats: { sent: 0, open: 0, click: 0, progress: 0 },
        content: i.content,
        send: i.send ?? 'now',
        history: [['created', ME, STAMP]],
      };
      db.marketing.campaigns.unshift(c);
      if (i.suggestion_id) db.marketing.used_suggestions.push(i.suggestion_id);
      // Zalo cá nhân 0 credit / tin; Email 1 credit / 100 tin (Blueprint §8 credits).
      return { campaign_id: c.id, code: c.code, est_recipients: est, est_credits: i.channel === 'email' ? Math.ceil(est / 100) : 0 };
    },
    undo: (db) => {
      db.marketing.campaigns.shift();
      db.marketing.seq--;
    },
  },
  'campaign.update': {
    execute: (db, i: { campaign_id: string; name?: string; content?: Campaign['content']; scheduled_at?: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'draft', 'rejected', 'scheduled', 'pending_approval');
      if (c.status !== 'draft' && c.status !== 'rejected') c.status = 'draft';
      if (i.name) c.name = i.name;
      if (i.content) c.content = i.content;
      if (i.scheduled_at) c.end = i.scheduled_at;
      log(c, 'edited');
      return { campaign_id: c.id, status: c.status };
    },
  },
  'campaign.submit': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'draft', 'rejected');
      c.status = 'pending_approval';
      log(c, 'submitted');
      return { campaign_id: c.id, status: c.status };
    },
    undo: (db, i: { campaign_id: string }) => {
      const c = db.marketing.campaigns.find((x) => x.id === i.campaign_id);
      if (c) c.status = 'draft';
    },
  },
  'campaign.send_test': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      return { sent_to: c.channel === 'email' ? 'tram@appchat.vn' : '0907 711 888' };
    },
  },
  'campaign.approve': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'pending_approval');
      c.status = c.send === 'schedule' ? 'scheduled' : 'running';
      log(c, 'approved');
      if (c.status === 'running') log(c, 'started', 'Hệ thống');
      return { campaign_id: c.id, status: c.status, recipients: c.est_recipients };
    },
    preview: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      return { summary: `${c.code} · ${c.name}`, count: c.est_recipients };
    },
  },
  'campaign.reject': {
    execute: (db, i: { campaign_id: string; reason: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'pending_approval');
      c.status = 'rejected';
      c.reject_reason = i.reason;
      log(c, 'rejected');
      return { campaign_id: c.id, status: c.status };
    },
  },
  'campaign.pause': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'running', 'scheduled');
      c.status = 'paused';
      log(c, 'paused');
      return { campaign_id: c.id, status: c.status };
    },
  },
  'campaign.resume': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'paused');
      c.status = c.stats.sent ? 'running' : 'scheduled';
      log(c, 'resumed');
      return { campaign_id: c.id, status: c.status };
    },
  },
  'campaign.cancel': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'draft', 'pending_approval', 'scheduled', 'running', 'paused');
      c.status = 'cancelled';
      log(c, 'cancelled');
      return { campaign_id: c.id, status: c.status };
    },
  },
  'campaign.delete': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      need(c, 'draft', 'rejected', 'cancelled');
      c.deleted = true;
      return { campaign_id: c.id };
    },
  },
};
