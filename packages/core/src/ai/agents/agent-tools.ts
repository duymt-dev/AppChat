// Quyền agent (D51, Blueprint §3.3b): danh sách Tools = action `agentGrantable`, nhóm theo module + "Kỹ năng AI" (`skill`), n/tổng
// mỗi nhóm; action cần connector chưa kết nối → badge `needs_connector`, chưa có manifest → `coming_soon` — vẫn hiện, KHÔNG vào run.
// Một nguồn cho Builder (`GET /v1/agents/:id/tools`), menu ＋ Hộp thư (`GET /v1/conversations/:id/agent-tools`) và runtime (TIP-022/023).
import { registry, type ActionDef } from '@appchat/actions';
import { channelRegistry } from '@appchat/channels';
import { connectorRegistry } from '@appchat/integrations';
import type { AgentToolsDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

const GRANTABLE: ActionDef[] = registry.filter((a) => a.agentGrantable);

type Badge = 'needs_connector' | 'coming_soon' | null;

/** Key channel / connector đã có manifest và đang kết nối ở workspace (kênh: tài khoản `connected`; connector: kết nối `connected`). */
export async function connectedKeys(tx: Pick<TenantTx, 'channelAccount' | 'integrationConnection'>): Promise<Set<string>> {
  const [ch, co] = await Promise.all([
    tx.channelAccount.findMany({ where: { status: 'connected' }, select: { type: true }, distinct: ['type'] }),
    tx.integrationConnection.findMany({ where: { status: 'connected' }, select: { connectorKey: true } }),
  ]);
  return new Set([...ch.map((c) => c.type), ...co.map((c) => c.connectorKey)]);
}

const known = (key: string) => channelRegistry.isConnectable(key) || connectorRegistry.isConnectable(key);

export function badgeOf(a: Pick<ActionDef, 'requiresConnector'>, connected: ReadonlySet<string>): Badge {
  if (!a.requiresConnector) return null;
  if (!known(a.requiresConnector)) return 'coming_soon';
  return connected.has(a.requiresConnector) ? null : 'needs_connector';
}

/**
 * Nhóm tool của agent. `onlyGranted` (menu ＋ Hộp thư — chỉ xem quyền hiệu lực) → chỉ tool đã cấp; Builder → mọi tool cấp được.
 * Thứ tự nhóm = thứ tự module trong registry, nhóm Kỹ năng AI cuối.
 */
export function groupTools(granted: readonly string[], connected: ReadonlySet<string>, onlyGranted = false): AgentToolsDto['groups'] {
  const on = new Set(granted);
  const by = new Map<string, AgentToolsDto['groups'][number]['tools']>();
  for (const a of GRANTABLE) {
    if (onlyGranted && !on.has(a.id)) continue;
    const key = a.skill ? 'skill' : a.module;
    const list = by.get(key) ?? [];
    list.push({ id: a.id, risk: a.risk, granted: on.has(a.id), badge: badgeOf(a, connected), connector: a.requiresConnector ?? null });
    by.set(key, list);
  }
  const keys = [...by.keys()].filter((k) => k !== 'skill');
  if (by.has('skill')) keys.push('skill');
  return keys.map((key) => {
    const tools = by.get(key)!;
    return { key, granted: tools.filter((t) => t.granted).length, total: tools.length, tools };
  });
}

/**
 * Bộ tool đưa vào run của agent (§3.3b): `tool_ids` đã cấp ∩ `agentGrantable` ∩ connector đã kết nối; có người ra lệnh
 * (`delegate` / Cowork) thì ∩ thêm quyền người đó (`allowed`) — executor vẫn kiểm lại permission ở MỖI lần gọi tool.
 */
export function runToolIds(granted: readonly string[], connected: ReadonlySet<string>, allowed?: (a: ActionDef) => boolean): string[] {
  const on = new Set(granted);
  return GRANTABLE.filter((a) => on.has(a.id) && badgeOf(a, connected) === null && (!allowed || allowed(a))).map((a) => a.id);
}
