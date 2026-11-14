// Sửa ticket hàng loạt (TIP-034c §1.1): chuẩn hoá tập id (bỏ trùng một lần, giữ thứ tự nhập cho kết quả), patch kết hợp (người phụ trách
// HOẶC agent + ưu tiên), map if_versions chỉ theo id đã chọn. Action / mock / UI cùng dùng — lỗi 422 trước khi có hiệu ứng nào.
import type { TICKET_PRIORITIES } from './ticket-state';

export const TICKET_BULK_MAX = 200;
type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Trường của patch (mặt nạ trường đã chọn — biên nhận / hoàn tác chỉ chạm các trường này). */
export type TicketBulkField = 'assignee' | 'priority';

export interface TicketBulkPatch {
  assignee_user_id?: string | undefined;
  assignee_agent_id?: string | undefined;
  priority?: TicketPriority | undefined;
}

/** Patch chuẩn: `assignee` = đúng một trong user / agent; không có trường nào → lỗi. */
export interface CanonicalTicketPatch {
  assignee?: { kind: 'user' | 'agent'; id: string };
  priority?: TicketPriority;
}

export type BulkPatchError = { field: string; code: string };

const nonEmpty = (v: string | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Patch kết hợp → dạng chuẩn hoặc lỗi theo trường (422). Hai ô người phụ trách cùng có giá trị / patch rỗng → lỗi. */
export function canonicalTicketPatch(p: TicketBulkPatch): CanonicalTicketPatch | BulkPatchError {
  const user = nonEmpty(p.assignee_user_id);
  const agent = nonEmpty(p.assignee_agent_id);
  if (user && agent) return { field: 'assignee', code: 'one_only' };
  const out: CanonicalTicketPatch = {};
  if (user) out.assignee = { kind: 'user', id: user };
  if (agent) out.assignee = { kind: 'agent', id: agent };
  if (p.priority) out.priority = p.priority;
  if (!out.assignee && !out.priority) return { field: 'change', code: 'required' };
  return out;
}

export const isPatchError = (x: CanonicalTicketPatch | BulkPatchError): x is BulkPatchError => 'code' in x;

export const patchFields = (p: CanonicalTicketPatch): TicketBulkField[] => [...(p.assignee ? ['assignee' as const] : []), ...(p.priority ? ['priority' as const] : [])];

/** Bỏ trùng một lần, giữ thứ tự xuất hiện đầu tiên; trả cả số id trùng đã gộp (UI báo "đã bỏ N trùng"). */
export function normalizeTicketIds(ids: readonly string[]): { ids: string[]; duplicates: number } {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return { ids: out, duplicates: ids.length - out.length };
}

/** if_versions chỉ nhận khoá thuộc tập đã chọn — khoá lạ là lỗi (không âm thầm bỏ qua). */
export function checkIfVersions(ids: readonly string[], v: Record<string, number> | undefined): BulkPatchError | null {
  if (!v) return null;
  const set = new Set(ids);
  for (const k of Object.keys(v)) if (!set.has(k.toLowerCase())) return { field: `if_versions.${k}`, code: 'not_selected' };
  return null;
}
