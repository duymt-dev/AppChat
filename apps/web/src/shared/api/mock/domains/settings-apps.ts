// Mock Cài đặt › Ứng dụng (Blueprint §4.4 channels / integrations): GET /settings/channels. Chỉ kênh có manifest (zalo_personal / webchat /
// email) kết nối được; còn lại "Sắp có" (omnichannel-adapter, D28). Kết nối Zalo cá nhân trả QR (channel.zalo.start_login).
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type SettingsChannel = (typeof fixture.channels)[number];
export type Connector = (typeof fixture.connectors)[number];
export type Widget = typeof fixture.widget;

export interface SettingsAppsState {
  channels: SettingsChannel[];
  connectors: Connector[];
  widget: Widget;
}

export const createSettingsAppsState = (): SettingsAppsState => ({
  channels: structuredClone(fixture.channels),
  connectors: structuredClone(fixture.connectors),
  widget: structuredClone(fixture.widget),
});

const connector = (db: MockDb, key: string) => {
  const c = db.settingsApps.connectors.find((x) => x.key === key);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: key });
  return c;
};

const channel = (db: MockDb, type: string) => {
  const c = db.settingsApps.channels.find((x) => x.type === type);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: type });
  if (!c.available) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'coming_soon', fields: { channel: 'coming_soon' } });
  return c;
};

const connect = (c: SettingsChannel, account: string) => {
  Object.assign(c, { connected: true, account, health: 'good', frt: '—' });
};

export const settingsAppsRoutes: Record<string, MockRoute> = {
  '/settings/integrations': (db) => db.settingsApps.connectors,
  '/settings/widget': (db) => db.settingsApps.widget,
  '/settings/channels': (db, p) => {
    const f = String(p.filter ?? 'all');
    return db.settingsApps.channels.filter((c) => f === 'all' || (f === 'on' ? c.connected : !c.connected));
  },
};

export const settingsAppsHandlers: Record<string, MockHandler> = {
  'channel.zalo.start_login': {
    execute: (db, i: { label?: string }) => {
      const c = channel(db, 'zalo_personal');
      connect(c, i.label?.trim() || c.account || 'Zalo cá nhân');
      return { channel_id: c.type, qr: 'zalo://login/qr/mock' };
    },
  },
  'channel.email.connect': {
    execute: (db, i: { address: string }) => {
      const c = channel(db, 'email');
      connect(c, i.address);
      return { channel_id: c.type };
    },
  },
  'channel.reconnect': {
    execute: (db, i: { channel_id: string }) => {
      const c = channel(db, i.channel_id);
      c.health = 'good';
      return { channel_id: c.type, status: 'connected' };
    },
  },
  'channel.disconnect': {
    execute: (db, i: { channel_id: string }) => {
      const c = channel(db, i.channel_id);
      Object.assign(c, { connected: false, health: 'off', frt: '—' });
      return { ok: true };
    },
  },
  'webchat.update_widget': {
    execute: (db, i: Partial<Omit<Widget, 'agent'>> & { agent_id?: string }) => {
      const w = db.settingsApps.widget;
      const { agent_id, actions, ...rest } = i;
      Object.assign(w, rest, agent_id ? { agent: agent_id } : {});
      if (actions) w.actions = actions.flatMap((a) => w.actions.filter((x) => x.key === a.key).map((x) => ({ ...x, on: a.on })));
      return { ok: true };
    },
  },
  'integration.connect': {
    execute: (db, i: { provider: string; fields: Record<string, string> }) => {
      const c = connector(db, i.provider);
      if (c.status !== 'ga') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'coming_soon', fields: { provider: 'coming_soon' } });
      const missing = c.fields.find((f) => !i.fields[f]?.trim());
      if (missing) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: missing, fields: { [missing]: 'required' } });
      c.connected = true;
      return { connection_id: `conn_${c.key}`, status: 'connected' };
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
