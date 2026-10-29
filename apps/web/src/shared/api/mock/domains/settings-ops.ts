// Mock Cài đặt › Vận hành (Blueprint §2 sla_policy mặc định, §3.4 support / notifications): GET /settings/sla (chính sách mặc định,
// giờ làm việc, quy tắc leo thang, dự báo rủi ro), /settings/notifications (tuỳ chọn thông báo của người dùng hiện tại).
// Ghi: sla.update_default, working_hours.update, notification.update_prefs.
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

type Sla = typeof fixture.sla;
type Notif = typeof fixture.notif;
type Policy = Sla['policy'];
type Channels = { desktop: boolean; email: boolean; mobile: boolean };

export interface SettingsOpsState {
  sla: Sla;
  notif: Notif;
}

export const createSettingsOpsState = (): SettingsOpsState => ({ sla: structuredClone(fixture.sla), notif: structuredClone(fixture.notif) });

export const settingsOpsRoutes: Record<string, MockRoute> = {
  '/settings/sla': (db) => db.settingsOps.sla,
  '/settings/notifications': (db) => db.settingsOps.notif,
};

export const settingsOpsHandlers: Record<string, MockHandler> = {
  'sla.update_default': {
    execute: (db, i: Partial<Pick<Policy, 'frt_ai' | 'frt_human' | 'ttr_ai' | 'ttr_human'>> & { escalation?: Record<string, boolean> }) => {
      const { escalation, ...mins } = i;
      Object.assign(db.settingsOps.sla.policy, mins);
      for (const [k, v] of Object.entries(escalation ?? {})) {
        const e = db.settingsOps.sla.escalation.find((x) => x.key === k);
        if (e) e.on = v;
      }
      return { ok: true };
    },
  },
  'working_hours.update': {
    execute: (db, i: { days: Sla['days']; pause_sla: boolean }) => {
      db.settingsOps.sla.days = i.days;
      db.settingsOps.sla.pause_sla = i.pause_sla;
      return { ok: true };
    },
  },
  'notification.update_prefs': {
    execute: (db, i: { events?: Record<string, Channels>; dnd?: Notif['dnd']; sound?: boolean; digest?: string }) => {
      const n = db.settingsOps.notif;
      for (const g of n.groups) for (const e of g.events) Object.assign(e, i.events?.[e.key] ?? {});
      if (i.dnd) n.dnd = i.dnd;
      if (i.sound !== undefined) n.sound = i.sound;
      if (i.digest) n.digest = i.digest;
      return { ok: true };
    },
  },
};
