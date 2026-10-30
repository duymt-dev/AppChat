// Quyền agent = tập action id (ai_agent.tool_ids, D51 §3.3b). Builder Tools, menu ＋ Hộp thư, tab Công cụ & Quyền Cowork
// đều nhóm theo module + "Kỹ năng AI" từ cùng nguồn này — tránh 3 nơi tự suy luận khác nhau.
import { registry, type ActionDef, type ModuleKey } from '@appchat/actions';

/** Mọi action agent có thể được cấp (D51 điểm 1–2): module thường + action đọc đánh dấu `skill`. */
export const AGENT_GRANTABLE: ActionDef[] = registry.filter((a) => a.agentGrantable);
export const SKILL_ACTIONS: ActionDef[] = AGENT_GRANTABLE.filter((a) => a.skill);
export const MODULE_ACTIONS: ActionDef[] = AGENT_GRANTABLE.filter((a) => !a.skill);

export interface ToolGroup {
  key: ModuleKey | 'skill';
  actions: ActionDef[];
  grantedCount: number;
}

/** Quyền hiệu lực = tool_ids của agent ∩ quyền người ra lệnh (khi có) — Blueprint §3.3b. */
export const effectiveToolIds = (agentToolIds: string[], commandingUserToolIds?: string[]): string[] =>
  commandingUserToolIds ? agentToolIds.filter((id) => commandingUserToolIds.includes(id)) : agentToolIds;

/** Nhóm action theo module (+ nhóm "skill" riêng); đếm số đã cấp / tổng trong mỗi nhóm. */
export function groupToolsByModule(actions: ActionDef[], grantedIds: readonly string[]): ToolGroup[] {
  const by = new Map<string, ActionDef[]>();
  for (const a of actions) {
    const k = a.skill ? 'skill' : a.module;
    by.set(k, [...(by.get(k) ?? []), a]);
  }
  return [...by.entries()].map(([key, items]) => ({
    key: key as ModuleKey | 'skill',
    actions: items,
    grantedCount: items.filter((a) => grantedIds.includes(a.id)).length,
  }));
}

/** Badge connector (D51 §3.3b): 'needs_connector' = có yêu cầu nhưng chưa kết nối; 'coming_soon' = chưa có manifest. */
export type ConnectorBadge = 'needs_connector' | 'coming_soon' | null;

export const connectorBadge = (action: ActionDef, connectedKeys: ReadonlySet<string>, knownKeys: ReadonlySet<string>): ConnectorBadge => {
  if (!action.requiresConnector) return null;
  if (!knownKeys.has(action.requiresConnector)) return 'coming_soon';
  return connectedKeys.has(action.requiresConnector) ? null : 'needs_connector';
};

/** Tập key channel/connector đã có manifest (biết) và đã kết nối — từ Cài đặt › Ứng dụng (settings-apps). */
export interface ConnectorStatusSource {
  channels: { type: string; available: boolean; connected: boolean }[];
  connectors: { key: string; status: string; connected: boolean }[];
}

export const connectorStatus = (src: ConnectorStatusSource) => {
  const known = new Set<string>([
    ...src.channels.filter((c) => c.available).map((c) => c.type),
    ...src.connectors.filter((c) => c.status !== 'coming_soon').map((c) => c.key),
  ]);
  const connected = new Set<string>([
    ...src.channels.filter((c) => c.connected).map((c) => c.type),
    ...src.connectors.filter((c) => c.connected).map((c) => c.key),
  ]);
  return { known, connected };
};
