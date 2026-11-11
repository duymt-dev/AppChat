// Hợp nhất vector + từ khoá cho một truy vấn discovery (TIP-023e §2.3-§2.4): "Combine vector top20 with current keyword top20 via
// existing RRF(k60); an exact permitted action ID ranks first." Dùng LẠI `rrf()` của packages/ai (cùng công thức kb/search.ts) — không
// phát minh thuật toán xếp hạng thứ hai. Score là BẰNG CHỨNG xếp hạng, không phải xác suất đúng/quyền; không tự ghi/gọi action từ top
// hit — tầng gọi (meta-tools) vẫn luôn qua call_action/confirm như mọi action khác.
import { rrf } from '@appchat/ai';
import type { AuthzContext } from '@appchat/shared';
import type { AssistantMode, Implemented } from '../catalog';
import { filterAuthorized } from './authority';

export interface RankedCandidate {
  id: string;
  score: number;
}

/** Hợp nhất 2 danh sách đã xếp hạng (vector + từ khoá, thứ tự tham số không ảnh hưởng RRF) bằng RRF(k=60); `exactId` (câu hỏi gõ
 *  đúng id action) luôn lên đầu nếu có mặt ở MỘT trong hai nhánh — không phụ thuộc may rủi điểm RRF của id đó. */
export function fuseRanking(vectorIds: readonly string[], keywordIds: readonly string[], exactId?: string): RankedCandidate[] {
  const fused = rrf([vectorIds, keywordIds]);
  const inEither = exactId !== undefined && (vectorIds.includes(exactId) || keywordIds.includes(exactId));
  if (!inEither) return fused;
  return [{ id: exactId!, score: Number.POSITIVE_INFINITY }, ...fused.filter((f) => f.id !== exactId)];
}

/** Tie-break tất định theo action ID (§2.4 "Deterministic tie by action ID") — dùng khi 2 candidate có cùng score RRF
 *  (hiếm vì RRF hiếm trùng điểm tuyệt đối, nhưng có thể khi cả hai nhánh đều không chứa 1 trong 2 id). */
export function sortDeterministic(list: RankedCandidate[]): RankedCandidate[] {
  return [...list].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Module restriction trước rank (§2.4 "Module restriction is applied before rank"): lọc danh sách ứng viên thô (trước fuseRanking)
 *  theo `module` nếu có — gọi ở nhánh build candidate list, KHÔNG sau khi đã rank (tránh lãng phí thứ hạng cho action bị loại). */
export function restrictModule(ids: readonly string[], module: string | undefined, moduleOf: (id: string) => string | undefined): string[] {
  return module ? ids.filter((id) => moduleOf(id) === module) : [...ids];
}

/** Đường ống đầy đủ: fuse → lọc quyền hiện hành (SAU rank — không certify quyền bằng candidate list) → cắt limit. `exactId` ưu
 *  tiên lên đầu CHỈ KHI còn hợp lệ sau lọc quyền (không lộ action người dùng không được gọi dù đúng tên). */
export function rankAndAuthorize(i: { vectorIds: readonly string[]; keywordIds: readonly string[]; exactId?: string; authz: AuthzContext; mode: AssistantMode; implemented: Implemented; module?: string; limit: number }): RankedCandidate[] {
  const fused = fuseRanking(i.vectorIds, i.keywordIds, i.exactId);
  const allowedIds = new Set(filterAuthorized(fused.map((f) => f.id), i.authz, i.mode, i.implemented, i.module).map((a) => a.id));
  return fused.filter((f) => allowedIds.has(f.id)).slice(0, i.limit);
}
