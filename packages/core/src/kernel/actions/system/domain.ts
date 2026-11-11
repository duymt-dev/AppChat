// Trigger cho action riêng TIỀN NHIỆM (TIP-003c §2 "Reuse predecessor actions"): 036 loyalty / 038 follow-up + digest / 039 billing giữ
// schema, guard actor và khoá chống lặp của domain (dedupe_key, source_key, biên nhận kỳ) — đăng ký verifier với `receipt: 'domain'`.
// Trigger chỉ mang nguồn bền + actor; capability niêm phong đúng input thô, không thêm alias / id mới.
import { AppError } from '@appchat/shared';
import type { SystemSourceKind } from './capability';
import type { SystemTrigger, SystemVerifier } from './admission';

export interface DomainTriggerInput {
  workspaceId: string;
  actionId: string;
  actor: string;
  sourceKind: SystemSourceKind;
  /** Nguồn bền (id sự kiện outbox / mốc lịch / id hoá đơn). */
  sourceRef: string;
  targetId: string;
  input: Record<string, unknown>;
  idempotencyKey?: string;
}

export const domainTrigger = (t: DomainTriggerInput): SystemTrigger => ({ ...t, generation: '', milestone: '' });

const cache = new Map<string, SystemVerifier>();

/** Verifier hẹp cho action tiền nhiệm: đúng actor + loại nguồn đã duyệt; trạng thái nghiệp vụ do handler đọc lại dưới khoá của domain.
 *  Cùng (actor, nguồn) → cùng hàm (nhiều app Nest trong một tiến trình đăng ký lại không bị coi là trùng). */
export function domainVerifier(actor: string, kinds: readonly SystemSourceKind[]): SystemVerifier {
  const k = `${actor}|${[...kinds].sort().join(',')}`;
  let v = cache.get(k);
  if (!v) {
    v = async (t) => {
      if (t.actor !== actor || !kinds.includes(t.sourceKind) || !t.sourceRef) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
    };
    cache.set(k, v);
  }
  return v;
}
