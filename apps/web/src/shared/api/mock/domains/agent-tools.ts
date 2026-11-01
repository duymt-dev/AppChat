// Mock quyền agent (D51, TIP-021): GET /agents/:id/tools (Builder) · /conversations/:id/agent-tools (menu ＋ Hộp thư, chỉ đọc).
// Cùng shape `agentToolsSchema` với API thật: nhóm module + Kỹ năng AI, badge connector. Agent phụ trách hội thoại trong mock =
// agent nhận kênh của hội thoại (fixture chưa có assignee_agent_id) — API thật: assignee_agent_id → agent của tài khoản kênh.
import { ApiRequestError, type AgentToolsDto } from '@appchat/shared';
import { connectorBadge, connectorStatus, groupToolsByModule, MODULE_ACTIONS, SKILL_ACTIONS } from '../../../ai/agent-tools';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

function status(db: MockDb) {
  const channels = db.settingsApps.channels.map((c) => ({ type: c.type, available: c.available, connected: c.accounts.some((a) => a.connected) }));
  return connectorStatus({ channels, connectors: db.settingsApps.connectors });
}

function groups(db: MockDb, granted: string[], onlyGranted: boolean): AgentToolsDto['groups'] {
  const { known, connected } = status(db);
  const pick = (list: typeof MODULE_ACTIONS) => (onlyGranted ? list.filter((a) => granted.includes(a.id)) : list);
  return [...groupToolsByModule(pick(MODULE_ACTIONS), granted), ...groupToolsByModule(pick(SKILL_ACTIONS), granted)].map((g) => ({
    key: g.key,
    granted: g.grantedCount,
    total: g.actions.length,
    tools: g.actions.map((a) => ({ id: a.id, risk: a.risk, granted: granted.includes(a.id), badge: connectorBadge(a, connected, known), connector: a.requiresConnector ?? null })),
  }));
}

const liveAgent = (db: MockDb, id: string) => db.agents.agents.find((a) => a.id === id && !a.deleted);

export const agentToolsParamRoute = (path: string): MockRoute | undefined => {
  const a = path.match(/^\/agents\/([^/]+)\/tools$/);
  if (a) {
    return (db) => {
      const ag = liveAgent(db, a[1]!);
      if (!ag) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: a[1]! });
      return { agent: { id: ag.id, name: ag.name }, groups: groups(db, ag.tools, false) } satisfies AgentToolsDto;
    };
  }
  const c = path.match(/^\/conversations\/([^/]+)\/agent-tools$/);
  if (!c) return undefined;
  return (db) => {
    const conv = db.inbox.conversations.find((x) => x.id === c[1]);
    if (!conv) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: c[1]! });
    const live = db.agents.agents.filter((x) => !x.deleted);
    const ag = live.find((x) => x.channels.includes(conv.channel)) ?? live[0];
    if (!ag) return { agent: null, groups: [] } satisfies AgentToolsDto;
    return { agent: { id: ag.id, name: ag.name }, groups: groups(db, ag.tools, true) } satisfies AgentToolsDto;
  };
};
