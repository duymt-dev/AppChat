// Mock Cài đặt › Ứng dụng (Blueprint §4.4 channels / integrations): GET /settings/channels — nhóm theo `type`, mỗi nhóm có
// `accounts[]` (REQ-B09 một kênh nhiều tài khoản); GET /settings/channels/:accountId/stats?days=7 (REQ-B11 khối hiệu suất).
// Chỉ kênh có manifest (zalo_personal / webchat / email) thêm tài khoản được; còn lại "Sắp có" (omnichannel-adapter, D28).
import {
  ApiRequestError,
  ROLE_DEFS,
  type ChannelAgentBehaviorDto,
  type ChannelCapabilitiesDto,
  type ChannelConnectDto,
} from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { requestContactSync } from './contact-sync';
import { applyBehavior, behaviorOf, mockBindingVersion, type BehaviorPatch } from './channel-behavior';

export type ChannelAccount = (typeof fixture.channels)[number]['accounts'][number];
export type SettingsChannel = (typeof fixture.channels)[number];
export type Connector = (typeof fixture.connectors)[number] & {
  port?: string;
  stock_master?: 'appchat' | 'external';
};
export type Widget = typeof fixture.widget;

export interface SettingsAppsState {
  channels: SettingsChannel[];
  connectors: Connector[];
  widget: Widget;
  seq: number;
  /** Tài khoản Zalo đang chờ quét QR (TIP-014): lần đọc `/login` đầu trả `waiting`, lần sau coi như đã quét → connected. */
  pendingLogin: Record<string, number>;
  /** Hành vi agent trực kênh theo tài khoản (TIP-022b) — lịch / phân luồng từ khoá / lời chào. */
  behavior: Record<string, ChannelAgentBehaviorDto>;
}

export const createSettingsAppsState = (): SettingsAppsState => ({
  channels: structuredClone(fixture.channels),
  connectors: structuredClone(fixture.connectors),
  widget: structuredClone(fixture.widget),
  seq: 0,
  pendingLogin: {},
  behavior: {},
});

/** PNG 1×1 — QR giả của mock (như transport Zalo giả của backend). */
export const MOCK_QR = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const HEALTH_RANK: Record<string, number> = { down: 0, off: 1, slow: 2, good: 3 };

const ZALO_PERSONAL_OPS = ['recall', 'react', 'group_info', 'group_members', 'group_link', 'group_add_members', 'group_settings', 'group_mute', 'profiles', 'friends', 'friend_requests', 'find_user'];
const META_BY_TYPE: Record<string, { connect: ChannelConnectDto; capabilities: ChannelCapabilitiesDto }> = {
  zalo_personal: {
    connect: { kind: 'qr', risk_notice: 'channels.zalo_personal.risk' },
    capabilities: { inbound: true, outbound: true, groups: true, reactions: true, operations: ZALO_PERSONAL_OPS },
  },
  email: {
    connect: { kind: 'credentials', risk_notice: null },
    capabilities: { inbound: true, outbound: true, groups: false, reactions: false, operations: ['reply'] },
  },
  webchat: {
    connect: { kind: 'embed', risk_notice: null },
    capabilities: { inbound: true, outbound: true, groups: false, reactions: false, operations: [] },
  },
};

/** Trạng thái gộp của một loại kênh từ các tài khoản (Blueprint §4.4 L973). */
const summarize = (c: SettingsChannel) => {
  const on = c.accounts.filter((a) => a.connected);
  const worst = on.reduce<SettingsChannel['accounts'][number] | null>(
    (w, a) => (!w || (HEALTH_RANK[a.health] ?? 0) < (HEALTH_RANK[w.health] ?? 0) ? a : w),
    null,
  );
  const meta = META_BY_TYPE[c.type] ?? {
    connect: { kind: 'oauth' as const, risk_notice: null },
    capabilities: { inbound: true, outbound: true, groups: false, reactions: false, operations: [] },
  };
  return {
    ...c,
    ...meta,
    connected: on.length > 0,
    health: worst?.health ?? ('off' as const),
    convs: on.reduce((n, a) => n + a.convs, 0),
    frt: worst?.frt ?? '—',
    account: c.accounts[0]?.name ?? '',
    agent: c.accounts[0]?.agent ?? '',
  };
};

/** Chia lead đang áp cho tài khoản (cùng logic GET /settings/channels của server): ghi đè → mặc định → chưa cấu hình. */
function routingOf(db: MockDb, accountId: string) {
  const own = db.leadRouting.rules.find((r) => r.channel_account_id === accountId);
  const r = own ?? db.leadRouting.rules.find((x) => x.channel_account_id === null);
  return r
    ? { source: own ? ('account' as const) : ('default' as const), rule_id: r.id, enabled: r.enabled, mode: r.mode, version: r.version }
    : { source: 'none' as const, rule_id: null, enabled: false, mode: 'manual', version: 0 };
}

const OPTIONAL: Record<string, string[]> = { sepay: ['api_key', 'hmac_secret', 'api_token'], casso: ['api_key'], brevo: ['sender_name', 'reply_to', 'webhook_token'], smtp: ['port', 'sender_email', 'sender_name', 'reply_to', 'sender_confirmed'] };

const connector = (db: MockDb, key: string) => {
  const c = db.settingsApps.connectors.find((x) => x.key === key);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: key });
  return c;
};

const channelByType = (db: MockDb, type: string) => {
  const c = db.settingsApps.channels.find((x) => x.type === type);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: type });
  if (!c.available) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'coming_soon', fields: { channel: 'coming_soon' } });
  return c;
};

export const findAccount = (db: MockDb, accountId: string) => {
  for (const c of db.settingsApps.channels) {
    const a = c.accounts.find((x) => x.id === accountId);
    if (a) return { channel: c, account: a };
  }
  throw new ApiRequestError(404, { code: 'NOT_FOUND', message: accountId });
};

const addAccount = (db: MockDb, type: string, name: string, connected = true): ChannelAccount => {
  const c = channelByType(db, type);
  const account: ChannelAccount = {
    id: `acc_${type}_${++db.settingsApps.seq}`,
    name,
    connected,
    convs: 0,
    frt: '—',
    health: 'good',
    agent: '',
    ai_mode: 'auto',
    hours: '08:00–18:00',
    greeting: '',
    assign_mode: 'round_robin',
    sla_policy: 'Mặc định',
    sync_messages: true,
    sync_auto_create_contact: true,
    history_days: 30,
    paused: false,
  };
  c.accounts.push(account);
  return account;
};

const behaviorDto = (db: MockDb, a: ChannelAccount & { agent_id?: string }) => {
  const b = behaviorOf(db, a.id);
  return { agent_behavior: b, binding_version: mockBindingVersion(a.agent_id, db.settingsApps.behavior[a.id]?.routing ?? null) };
};

export const settingsAppsRoutes: Record<string, MockRoute> = {
  '/settings/integrations': (db) => db.settingsApps.connectors,
  '/settings/widget': (db) => db.settingsApps.widget,
  '/settings/channels': (db, p) => {
    const f = String(p.filter ?? 'all');
    return db.settingsApps.channels
      .map((c) => summarize({ ...c, accounts: c.accounts.map((a) => ({ ...a, routing: routingOf(db, a.id), ...behaviorDto(db, a) })) }))
      .filter((c) => f === 'all' || (f === 'on' ? c.connected : !c.connected));
  },
};

/** Route có tham số: /settings/channels/:accountId/stats · /settings/channels/:accountId/login (trạng thái QR — TIP-014). */
export const settingsAppsParamRoute = (path: string): MockRoute | null => {
  const lg = path.match(/^\/settings\/channels\/([^/]+)\/login$/);
  if (lg) {
    const id = lg[1]!;
    return (db) => {
      const { account } = findAccount(db, id);
      const seen = db.settingsApps.pendingLogin[id];
      if (seen === undefined) return { account_id: id, status: account.connected ? 'connected' : 'expired', qr: null, expires_at: null };
      if (seen === 0) {
        db.settingsApps.pendingLogin[id] = 1;
        return { account_id: id, status: 'waiting', qr: MOCK_QR, expires_at: new Date(Date.now() + 100_000).toISOString() };
      }
      delete db.settingsApps.pendingLogin[id];
      account.connected = true;
      account.health = 'good';
      return { account_id: id, status: 'connected', qr: null, expires_at: null };
    };
  }
  const m = path.match(/^\/settings\/channels\/([^/]+)\/stats$/);
  if (!m) return null;
  const accountId = m[1]!;
  return (db) => {
    const { account } = findAccount(db, accountId);
    const seed = account.id.split('_').reduce((n, s) => n + s.length, 0);
    const days = Array.from({ length: 7 }, (_, i) => ({
      day: i,
      convs: Math.max(0, Math.round(account.convs / 14) + ((seed + i * 3) % 7) - 3),
      frt_sec: 30 + ((seed + i * 5) % 90),
    }));
    return { account_id: accountId, days, total_convs: days.reduce((n, d) => n + d.convs, 0) };
  };
};

export const settingsAppsHandlers: Record<string, MockHandler> = {
  'channel.zalo.start_login': {
    execute: (db, i: { label?: string }) => {
      const account = addAccount(db, 'zalo_personal', i.label?.trim() || 'Zalo cá nhân', false);
      account.health = 'slow';
      db.settingsApps.pendingLogin[account.id] = 0;
      return { channel_account_id: account.id, qr: `/settings/channels/${account.id}/login` };
    },
  },
  'channel.email.connect': {
    execute: (db, i: { address: string; fields?: Record<string, string> }) => {
      if (!i.fields?.imap_host?.trim() || !i.fields.password) {
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'fields', fields: { imap_host: 'required' } });
      }
      const account = addAccount(db, 'email', i.address);
      return { channel_account_id: account.id };
    },
  },
  'channel.test': {
    execute: (_db, i: { channel_account_id?: string; type?: string; fields?: Record<string, string> }) => {
      const isCredentials = !!i.type && META_BY_TYPE[i.type]?.connect.kind === 'credentials';
      if (isCredentials && i.fields && !i.fields.imap_host?.trim()) {
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'imap_host', fields: { imap_host: 'required' } });
      }
      // Mock: mật khẩu "sai" mô phỏng đăng nhập thất bại (backend: lý do imap_auth — TIP-018).
      if (isCredentials && i.fields?.password === 'sai') return { ok: false, message: 'Sai email hoặc mật khẩu ứng dụng (IMAP)' };
      return { ok: true, message: 'Kết nối thành công' };
    },
  },
  'channel.update_settings': {
    execute: (db, i: { channel_account_id: string; patch: Partial<ChannelAccount> & { agent_id?: string } & BehaviorPatch; expected_version?: string }) => {
      // TIP-042b: bản chiếu `assign_mode` là cấu hình phân công → cần crm.reassign; giá trị cũ `shift` không nhận mới.
      if (i.patch.assign_mode !== undefined && !(ROLE_DEFS[db.role].permissions as readonly string[]).includes('crm.reassign')) {
        throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'crm.reassign', fields: { permission: 'crm.reassign' } });
      }
      if (i.patch.assign_mode === 'shift') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'assign_mode', fields: { 'patch.assign_mode': 'invalid' } });
      const { account } = findAccount(db, i.channel_account_id);
      const { agent_id, schedule, routing, greeting_enabled, ...rest } = i.patch;
      // TIP-022b: hành vi agent kiểm + ghi trước (lỗi 409 / 422 không để lại thay đổi nửa vời).
      applyBehavior(db, account.id, (account as { agent_id?: string }).agent_id, { schedule, routing, greeting_enabled }, i.expected_version);
      // Trường bỏ trống (undefined) = không đổi — như server; riêng sla_override: null = xoá ghi đè.
      Object.assign(account, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
      if ((rest as { sla_override?: unknown }).sla_override === null) delete (account as { sla_override?: unknown }).sla_override;
      // Bản ghi agent_id + tên hiển thị (backend: settings.agent_id; tên từ bảng ai_agent — TIP-021).
      if (agent_id !== undefined) {
        const a = agent_id ? db.agents.agents.find((x) => x.id === agent_id) : null;
        Object.assign(account, { agent_id: agent_id || undefined, agent: a?.name ?? '' });
      }
      return { ok: true };
    },
  },
  'channel.pause': {
    execute: (db, i: { channel_account_id: string }) => {
      findAccount(db, i.channel_account_id).account.paused = true;
      return { ok: true };
    },
  },
  'channel.resume': {
    execute: (db, i: { channel_account_id: string }) => {
      findAccount(db, i.channel_account_id).account.paused = false;
      return { ok: true };
    },
  },
  // Danh bạ Zalo (TIP-014b D3) — như server: 202 + /contact-syncs/:id; không tạo khách.
  'channel.sync_contacts': {
    execute: (db, i: { channel_account_id: string }) => requestContactSync(db, i.channel_account_id),
  },
  'channel.sync_history': {
    execute: (db, i: { channel_account_id: string; history_days: 0 | 7 | 30 | 90 }) => {
      const { channel, account } = findAccount(db, i.channel_account_id);
      account.history_days = i.history_days;
      // Như server (TIP-014b C): Zalo đang chạy + khoảng > 0 → lần lấy lịch sử bền, 202 job_accepted.
      if (channel.type !== 'zalo_personal' || !account.connected || account.paused || !i.history_days) return { ok: true };
      const id = crypto.randomUUID();
      return { ok: true, __accepted: { job_id: id, status_url: `/v1/settings/channels/${account.id}/syncs/${id}` } };
    },
  },
  'channel.reconnect': {
    execute: (db, i: { channel_account_id: string }) => {
      const { account } = findAccount(db, i.channel_account_id);
      account.connected = false;
      account.health = 'slow';
      db.settingsApps.pendingLogin[account.id] = 0;
      return { channel_account_id: account.id, status: 'connecting' };
    },
  },
  'channel.disconnect': {
    execute: (db, i: { channel_account_id: string }) => {
      const { channel, account } = findAccount(db, i.channel_account_id);
      channel.accounts = channel.accounts.filter((a) => a.id !== account.id);
      return { ok: true };
    },
  },
  'webchat.update_widget': {
    execute: (db, i: Partial<Omit<Widget, 'agent' | 'prechat'>> & { agent_id?: string; prechat?: boolean }) => {
      const w = db.settingsApps.widget;
      const { agent_id, actions, ...rest } = i;
      Object.assign(w, rest, agent_id !== undefined ? { agent: agent_id } : {});
      if (actions) w.actions = actions.flatMap((a) => w.actions.filter((x) => x.key === a.key).map((x) => ({ ...x, on: a.on })));
      w.kpis.running = w.enabled ? 1 : 0;
      return { ok: true, channel_account_id: w.channel_account_id ?? undefined, public_key: w.public_key ?? undefined };
    },
  },
  'integration.connect': {
    execute: (db, i: { provider: string; fields: Record<string, string> }) => {
      const c = connector(db, i.provider);
      if (c.status !== 'ga') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'coming_soon', fields: { provider: 'coming_soon' } });
      // Trường tuỳ chọn theo manifest (SePay: API key HOẶC khoá HMAC; Casso: API key gọi ra) — như splitFields + validate của server.
      const optional = OPTIONAL[c.key] ?? [];
      const missing = c.fields.find((f) => !optional.includes(f) && !i.fields[f]?.trim()) ?? (c.key === 'sepay' && !i.fields.api_key?.trim() && !i.fields.hmac_secret?.trim() ? 'api_key' : undefined);
      if (missing) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: missing, fields: { [missing]: 'required' } });
      if (c.group === 'commerce' || c.port === 'order_sync') {
        const sm = i.fields.stock_master?.trim();
        if (sm && sm !== 'appchat' && sm !== 'external') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'invalid', fields: { stock_master: 'invalid' } });
        c.stock_master = (sm as 'appchat' | 'external' | undefined) ?? c.stock_master ?? 'appchat';
      }
      c.connected = true;
      return { connection_id: `conn_${c.key}`, status: 'connected' };
    },
  },
  'integration.update_settings': {
    execute: (db, i: { provider: string; stock_master: 'appchat' | 'external' }) => {
      const c = connector(db, i.provider);
      if (!c.connected) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'not_connected', fields: { provider: 'not_connected' } });
      if (c.group !== 'commerce' && c.port !== 'order_sync') {
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'not_order_sync', fields: { provider: 'not_order_sync' } });
      }
      c.stock_master = i.stock_master;
      return { connection_id: `conn_${c.key}`, stock_master: c.stock_master };
    },
  },
  'integration.disconnect': {
    execute: (db, i: { provider: string }) => {
      connector(db, i.provider).connected = false;
      return { ok: true };
    },
  },
  'integration.register_interest': {
    execute: (db, i: { provider: string }) => {
      connector(db, i.provider).interest = true;
      return { ok: true };
    },
  },
};
