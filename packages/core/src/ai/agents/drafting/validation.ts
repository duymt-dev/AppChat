// Kiểm bản soạn theo quyền HIỆN HÀNH trước khi lộ ra (TIP-021b §2.5): đọc lại quyền người ra lệnh (không dùng AuthzContext lúc bắt đầu),
// giao tool với ứng viên còn được phép (quyền + có handler + cấp được cho agent), bỏ id vừa bị thu hồi kèm cảnh báo `tools_revoked` (chỉ
// mã + số lượng, không tên / mô tả). Mất `agents.manage` → từ chối cả kết quả. Khuôn input của ứng viên đổi trong lúc sinh → 409 stale
// (soạn lại hoặc dùng Builder), không âm thầm cấp cấu hình cũ. Nạp quyền một lần cho cả lượt kiểm, ≤ 24 ứng viên (không N+1).
import { registry } from '@appchat/actions';
import { AppError, can, type AuthzContext } from '@appchat/shared';
import type { Implemented } from '../../assistant/catalog';
import { filterAuthorized } from '../../assistant/discovery/authority';
import type { AgentConfig } from '../agent.store';
import { grantableForAgent, schemaHashOf, type DraftCandidate } from './discovery';

const BY_ID = new Map(registry.map((a) => [a.id, a]));

export type DraftWarning = 'no_candidate_tools' | 'tools_revoked' | 'keyword_discovery';

export interface Validated {
  draft: AgentConfig;
  warnings: DraftWarning[];
  revoked: number;
}

/** Quyền hiện tại của người ra lệnh; null = rời workspace / không còn active. */
export type CurrentAuthz = () => Promise<AuthzContext | null>;

export async function currentManager(authzOf: CurrentAuthz): Promise<AuthzContext> {
  const a = await authzOf();
  if (!a || !can(a, 'agents.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'agents.manage' });
  return a;
}

/** Ứng viên còn được phép lúc này (cùng bộ lọc discovery dùng lúc tìm) — không cần query thêm (registry + authz trong bộ nhớ). */
export function stillAllowed(candidates: readonly DraftCandidate[], authz: AuthzContext, implemented: Implemented): Set<string> {
  return new Set(filterAuthorized(candidates.map((c) => c.id), authz, 'cowork', implemented, undefined, grantableForAgent).map((a) => a.id));
}

/** Khuôn input của ứng viên đổi kể từ lúc tìm (registry mới đã deploy giữa chừng) → bản soạn cũ. */
export function assertCandidatesCurrent(candidates: readonly DraftCandidate[]): void {
  const stale = candidates.some((c) => !BY_ID.has(c.id) || schemaHashOf(c.id) !== c.schemaHash);
  if (stale) throw new AppError('CONFLICT', 409, { draft: 'stale_candidates' }, 'Danh sách công cụ đã đổi trong lúc soạn — soạn lại hoặc mở Builder');
}

export function validateDraft(draft: AgentConfig, candidates: readonly DraftCandidate[], authz: AuthzContext, implemented: Implemented, keyword: boolean): Validated {
  assertCandidatesCurrent(candidates);
  const allowed = stillAllowed(candidates, authz, implemented);
  const tools = draft.tools.filter((id) => allowed.has(id));
  const revoked = draft.tools.length - tools.length;
  const warnings: DraftWarning[] = [];
  if (!candidates.length) warnings.push('no_candidate_tools');
  if (revoked > 0) warnings.push('tools_revoked');
  if (keyword) warnings.push('keyword_discovery');
  return { draft: { ...draft, tools }, warnings, revoked };
}
