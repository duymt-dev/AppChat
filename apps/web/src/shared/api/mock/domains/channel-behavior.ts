// Mock hành vi agent trực kênh của tài khoản (TIP-022b) — như server `channel.update_settings` + GET /settings/channels: lịch có cấu
// trúc (validate chung `validateSchedule`), phân luồng từ khoá (ứng viên là agent đã xuất bản, không trùng, bật cần ≥ 1), lời chào bật
// tường minh; `binding_version` băm agent_id + routing → `expected_version` lệch = 409 giữ gán cũ.
import { ApiRequestError, canonicalSchedule, type ChannelAgentBehaviorDto, type ChannelRoutingDto, type WeeklyScheduleDto } from '@appchat/shared';
import type { MockDb } from '../store';

export type BehaviorPatch = { schedule?: WeeklyScheduleDto | null; routing?: ChannelRoutingDto; greeting_enabled?: boolean };

const empty = (): ChannelAgentBehaviorDto => ({ schedule: null, routing: { enabled: false, candidates: [] }, greeting_enabled: false });

export const behaviorOf = (db: MockDb, accountId: string): ChannelAgentBehaviorDto => db.settingsApps.behavior[accountId] ?? empty();

/** Băm djb2 (không có node:crypto trên trình duyệt) — chỉ cần đổi khi agent_id / routing đổi, như server. */
export function mockBindingVersion(agentId: string | null | undefined, routing: ChannelRoutingDto | null | undefined): string {
  const s = JSON.stringify([agentId ?? null, routing ?? null]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

const invalid = (fields: Record<string, string>) => new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: Object.keys(fields)[0] ?? 'invalid', fields });

/** Kiểm + áp phần hành vi của patch; trả về `true` khi patch có trường hành vi. */
export function applyBehavior(db: MockDb, accountId: string, agentId: string | null | undefined, patch: BehaviorPatch, expected?: string): void {
  if (expected && mockBindingVersion(agentId, db.settingsApps.behavior[accountId]?.routing ?? null) !== expected) {
    throw new ApiRequestError(409, { code: 'CONFLICT', message: 'expected_version', fields: { expected_version: 'stale' } });
  }
  const cur = behaviorOf(db, accountId);
  const next = { ...cur };
  if (patch.schedule !== undefined) {
    if (patch.schedule === null) next.schedule = null;
    else {
      const { schedule, errors } = canonicalSchedule(patch.schedule);
      const first = Object.entries(errors)[0];
      if (first) throw invalid({ [`patch.schedule.${first[0]}`]: first[1] });
      next.schedule = schedule;
    }
  }
  if (patch.routing !== undefined) {
    const ids = patch.routing.candidates.map((c) => c.agent_id);
    if (new Set(ids).size !== ids.length) throw invalid({ 'routing.candidates': 'duplicate' });
    if (patch.routing.enabled && !ids.length) throw invalid({ 'routing.candidates': 'required' });
    patch.routing.candidates.forEach((c, i) => {
      const a = db.agents.agents.find((x) => x.id === c.agent_id && !x.deleted);
      if (!a || a.version < 1) throw invalid({ [`routing.candidates.${i}.agent_id`]: 'not_published' });
    });
    next.routing = { enabled: patch.routing.enabled, candidates: patch.routing.candidates.map((c) => ({ ...c, keywords: [...new Set(c.keywords.map((k) => k.trim()).filter(Boolean))] })) };
  }
  if (patch.greeting_enabled !== undefined) next.greeting_enabled = patch.greeting_enabled;
  db.settingsApps.behavior[accountId] = next;
}

/** Xem trước gán tài khoản khi xuất bản agent (TIP-022b E) — agent đang gán thật của từng tài khoản đang dùng theo loại kênh. */
export function channelBindingPreview(db: MockDb, types: string[]) {
  const accounts = db.settingsApps.channels
    .filter((c) => !types.length || types.includes(c.type))
    .flatMap((c) => c.accounts.filter((a) => a.connected).map((a) => ({ c, a: a as typeof a & { agent_id?: string } })));
  return {
    accounts: accounts.slice(0, 50).map(({ c, a }) => ({
      channel_account_id: a.id,
      name: a.name,
      type: c.type,
      current_agent_id: a.agent_id ?? null,
      current_agent: a.agent_id ? (db.agents.agents.find((x) => x.id === a.agent_id)?.name ?? '') : '',
      version: mockBindingVersion(a.agent_id, db.settingsApps.behavior[a.id]?.routing ?? null),
    })),
  };
}
