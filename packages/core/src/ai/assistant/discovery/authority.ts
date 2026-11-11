// Lọc quyền HIỆN HÀNH cho danh sách action_id tìm được (TIP-023e §2.2): "Selection is not permission." — một action_id lọt qua
// vector/keyword ranking không có nghĩa người dùng được gọi nó; mọi candidate phải đi lại ĐÚNG bộ lọc catalog.ts dùng cho find_actions
// từ khoá (HIDDEN/SYSTEM_ONLY/platform_admin, quyền authz, chế độ Chat chỉ read, action có handler thật) — một nguồn sự thật DUY NHẤT,
// không tự chế lại rule. Gọi lại hàm này NGAY TRƯỚC KHI trả kết quả cho model (sau mọi chờ provider/DB) — quyền có thể đổi giữa lúc
// vector query chạy và lúc kết quả được serialize.
import { registry, type ActionDef } from '@appchat/actions';

/** Bộ lọc mục đích thêm (TIP-021b: soạn agent chỉ nhận action `agentGrantable`) — áp CÙNG chỗ lọc quyền, trước rank / limit. */
export type Admit = (a: ActionDef) => boolean;
import type { AuthzContext } from '@appchat/shared';
import { allowedFor, modeAllows, type AssistantMode, type Implemented } from '../catalog';

const BY_ID = new Map(registry.map((a) => [a.id, a]));

/** `action_id` hiện gọi được: quyền + chế độ + module (nếu lọc) + có handler thật. `undefined` nếu id không còn trong registry
 *  (defensive — document của generation cũ trỏ action đã xoá khỏi registry, hiếm nhưng không được ném lỗi, chỉ lọc bỏ). */
export function currentlyAllowed(a: ActionDef | undefined, authz: AuthzContext, mode: AssistantMode, implemented: Implemented, module?: string, admit?: Admit): boolean {
  if (!a) return false;
  if (admit && !admit(a)) return false;
  if (module && a.module !== module) return false;
  return allowedFor(a, authz) && modeAllows(a, mode) && implemented(a.id);
}

/** Lọc một danh sách action_id (thứ tự ranking giữ nguyên, chỉ bỏ không đủ quyền) — dùng SAU vector/keyword ranking, TRƯỚC khi
 *  chiếu schema/trả kết quả. Action_id không có trong registry (tra `BY_ID`) bị loại âm thầm (không throw — không phải lỗi người gọi). */
export function filterAuthorized(ids: readonly string[], authz: AuthzContext, mode: AssistantMode, implemented: Implemented, module?: string, admit?: Admit): ActionDef[] {
  const out: ActionDef[] = [];
  for (const id of ids) {
    const a = BY_ID.get(id);
    if (currentlyAllowed(a, authz, mode, implemented, module, admit)) out.push(a!);
  }
  return out;
}
