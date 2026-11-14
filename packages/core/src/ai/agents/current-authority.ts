// Quyền hiện hành mỗi lần agent gọi tool (TIP-023b SPEC A.1–2, Blueprint §3.3b, D51): không cache quyền cho cả run. Mỗi lời gọi đọc lại
// (1) agent còn tồn tại + đang chạy (paused / xoá → chặn), (2) tool còn trong bản ĐÃ XUẤT BẢN (thu hồi có hiệu lực ngay lần gọi kế; tool mới
// giữa run KHÔNG tự thêm — giao với snapshot lúc dựng run), (3) connector tool cần vẫn đang kết nối, (4) có người ra lệnh ban đầu thì
// membership + quyền hiện tại của người đó (rời workspace / mất quyền → chặn, không rơi về quyền agent). Run trực kênh vốn không có người ra
// lệnh khác với run mất người ra lệnh. Chỉ đọc — không gọi execute để thử quyền.
import type { ActionDef } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { agentAuthz } from './agent-authz';
import { badgeOf, connectedKeys } from './agent-tools';

export type AuthorityDenied = { ok: false; code: 'FORBIDDEN'; reason: 'agent_inactive' | 'tool_revoked' | 'connector_missing' | 'commander_lost' };
export type Authority = { ok: true; authz: AuthzContext } | AuthorityDenied;

export interface AuthorityInput {
  db: Pick<TenantDb, 'aiAgent' | 'aiAgentVersion' | 'channelAccount' | 'integrationConnection'>;
  ws: string;
  agentId: string;
  def: Pick<ActionDef, 'id' | 'requiresConnector'>;
  /** Tool đã cấp lúc dựng run (snapshot bản xuất bản) — quyền = snapshot ∩ grant hiện tại. */
  snapshot: readonly string[];
  /** Người ra lệnh ban đầu của run (delegate / task / resume); vắng = run trực kênh. */
  commanderId?: string;
  /** AuthzContext hiện tại của người ra lệnh — null khi đã rời workspace / không còn active. */
  commander?: (ws: string, userId: string) => Promise<AuthzContext | null>;
  /** Agent chat thử (dryRun) dùng cấu hình nháp: bỏ kiểm trạng thái / bản xuất bản, vẫn kiểm người ra lệnh. */
  draft?: boolean;
  /** Bản xuất bản đã ghim (agent người dùng chọn — TIP-023d §5.4): xuất bản bản khác → chặn, cấu hình mới không thay bản đã ghim. */
  version?: number;
}

const deny = (reason: AuthorityDenied['reason']): AuthorityDenied => ({ ok: false, code: 'FORBIDDEN', reason });

/** Grant hiện tại = tool của bản đang chạy (published); agent chưa xuất bản → không có grant. */
async function publishedTools(db: AuthorityInput['db'], a: { id: string; publishedVersion: number }): Promise<string[] | null> {
  if (!a.publishedVersion) return null;
  const v = await db.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: a.publishedVersion } }, select: { config: true } });
  const tools = (v?.config as { tools?: unknown } | null)?.tools;
  return Array.isArray(tools) ? tools.filter((t): t is string => typeof t === 'string') : [];
}

export async function currentAuthority(i: AuthorityInput): Promise<Authority> {
  const a = await i.db.aiAgent.findUnique({ where: { id: i.agentId }, select: { id: true, status: true, deletedAt: true, publishedVersion: true, toolIds: true } });
  if (!a || a.deletedAt) return deny('agent_inactive');
  if (!i.draft && a.status !== 'active') return deny('agent_inactive');
  if (i.version !== undefined && a.publishedVersion !== i.version) return deny('agent_inactive');
  const granted = i.draft ? a.toolIds : await publishedTools(i.db, a);
  if (!granted) return deny('agent_inactive');
  const now = new Set(granted);
  const tools = i.snapshot.filter((t) => now.has(t));
  if (!tools.includes(i.def.id)) return deny('tool_revoked');
  if (i.def.requiresConnector && badgeOf(i.def, await connectedKeys(i.db)) !== null) return deny('connector_missing');
  let commander: AuthzContext | undefined;
  if (i.commanderId) {
    const c = i.commander ? await i.commander(i.ws, i.commanderId) : null;
    if (!c) return deny('commander_lost');
    commander = c;
  }
  return { ok: true, authz: agentAuthz({ id: a.id, toolIds: tools }, commander) };
}
