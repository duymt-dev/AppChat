// Quyền nguồn hiện hành cho truy hồi (TIP-020c §2.2–2.3, rag §3): từ binding tin cậy + người hiệu lực HIỆN TẠI → restriction áp vào SQL
// trước khi chọn ứng viên. Kênh / khách → chỉ public. Trợ lý / làm cho người → public + internal mà người đó đọc được THEO MODULE gốc:
//   - tài liệu thường (upload / url / text, không gắn bản ghi): Owner hoặc người quản lý kho (kb.manage) — vốn đã mở được tệp gốc;
//   - nguồn gắn sản phẩm (catalog): catalog.view + sản phẩm còn sống (kb.manage KHÔNG đủ);
//   - nguồn từ hội thoại (đề xuất đã duyệt): đọc được hội thoại gốc theo scope inbox hiện hành (kb.manage KHÔNG đủ); thiếu nguồn gốc → không dùng.
// Mọi chế độ: nguồn hội thoại của khách đã "Quên" (privacy fence) không bao giờ ra. Agent có phạm vi: phạm vi lúc nhận run VÀ phạm vi bản
// đang xuất bản (đọc lại mỗi lần — tạm dừng / xoá / thu hẹp có hiệu lực ngay); rỗng → không truy hồi (không gọi embed, không trừ credit).
import type { TenantDb } from '@appchat/db';
import { can, type AuthzContext } from '@appchat/shared';
import { normalizeScope, scopeEmpty } from './context';
import type { KbScope, KnowledgeContext, ScopeDenied } from './types';

export type Principal = { kind: 'public' } | { kind: 'user'; authz: AuthzContext };

export interface Restriction {
  principal: Principal;
  /** Phạm vi lúc nhận run (null = Trợ lý không phạm vi). */
  admitted: KbScope | null;
  /** Phạm vi hiện hành (bản đã xuất bản / nháp Builder); null = không phạm vi. */
  current: KbScope | null;
}

export type Admission = { ok: true; r: Restriction } | { ok: false; reason: ScopeDenied };

const deny = (reason: ScopeDenied): Admission => ({ ok: false, reason });

/** Phạm vi của bản agent đang xuất bản — agent tạm dừng / xoá / chưa xuất bản → null. */
export async function publishedScope(db: Pick<TenantDb, 'aiAgent' | 'aiAgentVersion'>, agentId: string): Promise<KbScope | null> {
  const a = await db.aiAgent.findUnique({ where: { id: agentId }, select: { id: true, status: true, deletedAt: true, publishedVersion: true } });
  if (!a || a.deletedAt || a.status !== 'active' || !a.publishedVersion) return null;
  const v = await db.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: a.publishedVersion } }, select: { config: true } });
  return v ? normalizeScope((v.config as { kb_scope?: Partial<KbScope> } | null)?.kb_scope) : null;
}

/**
 * Nhận một lần truy hồi: binding + người hiệu lực hiện tại (Trợ lý: người gọi; làm cho người: người ra lệnh đọc lại, đã thu hẹp theo tác
 * vụ). Không có người khi cần → commander_lost; agent không còn chạy → agent_inactive; phạm vi rỗng → scope_empty (không phải "tất cả").
 */
export async function admit(db: Pick<TenantDb, 'aiAgent' | 'aiAgentVersion'>, k: KnowledgeContext, who: AuthzContext | null | undefined): Promise<Admission> {
  if (k.kind === 'assistant_unscoped') return who ? { ok: true, r: { principal: { kind: 'user', authz: who }, admitted: null, current: null } } : deny('commander_lost');
  let current: KbScope;
  if (k.kind === 'agent_scoped') {
    const cur = await publishedScope(db, k.agent_id);
    if (!cur) return deny('agent_inactive');
    current = cur;
  } else current = k.scope;
  if (scopeEmpty(k.scope) || scopeEmpty(current)) return deny('scope_empty');
  if (k.mode === 'channel') return { ok: true, r: { principal: { kind: 'public' }, admitted: k.scope, current } };
  return who ? { ok: true, r: { principal: { kind: 'user', authz: who }, admitted: k.scope, current } } : deny('commander_lost');
}

/** Quyền đọc internal theo nhóm nguồn của người hiệu lực (dùng ở SQL lọc + kiểm lại provenance). */
export function internalRights(a: AuthzContext): { documents: boolean; catalog: boolean; inbox: boolean } {
  return { documents: a.isOwner || a.permissions.has('kb.manage'), catalog: can(a, 'catalog.view'), inbox: can(a, 'inbox.view') };
}
