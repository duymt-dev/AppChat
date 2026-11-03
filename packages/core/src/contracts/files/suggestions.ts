// Khối gợi ý AI của hợp đồng nháp (TIP-030b spec 11): mỗi khối có id ổn định, chữ, trạng thái pending → kept | discarded và version
// (CAS `if_version` — hai người Giữ / Bỏ cùng lúc: người sau nhận CONFLICT, không ghi đè im lặng). `contract.submit` chặn khi còn
// pending (cổng bắt buộc ở server, không chỉ tắt nút). Khối kept vào nội dung ký (escape, sau điều khoản mẫu); discarded không render.
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import { pendingOf, type AiSuggestion } from './draft-content';

/** Người yêu cầu đề xuất: người dùng gốc (Trợ lý / agent làm thay vẫn tính người ra lệnh) hoặc chính actor. */
export const proposalActor = (ctx: ActionContext) => (ctx.onBehalfOfUserId ? `user:${ctx.onBehalfOfUserId}` : `${ctx.actor.type}:${ctx.actor.id}`);

export function suggestionsOf(v: unknown): AiSuggestion[] {
  return Array.isArray(v) ? (v as AiSuggestion[]) : [];
}

/** Giữ / Bỏ một khối: sai version → CONFLICT kèm version hiện tại; đã xử lý → giữ nguyên (idempotent theo cùng quyết định). */
export function resolveSuggestion(list: AiSuggestion[], id: string, decision: 'keep' | 'discard', ifVersion: number) {
  const s = list.find((x) => x.id === id);
  if (!s) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
  if (s.version !== ifVersion) throw new AppError('CONFLICT', 409, { version: String(s.version) });
  const status = decision === 'keep' ? 'kept' : 'discarded';
  const next = list.map((x) => (x.id === id ? { ...x, status, version: x.version + 1 } : x)) as AiSuggestion[];
  return { next, status: status as 'kept' | 'discarded', version: s.version + 1, pending: pendingOf(next) };
}

/** Cổng trình duyệt: còn khối AI chưa Giữ / Bỏ → không cho trình duyệt. */
export function assertResolved(list: unknown) {
  const n = pendingOf(list);
  if (n) throw new AppError('VALIDATION_FAILED', 422, { ai_suggestions: 'unresolved' }, String(n));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML các khối đã Giữ — chèn sau thân mẫu (điều khoản mẫu nguyên văn). Chữ luôn escape. */
export function keptHtml(list: unknown, heading: string): string {
  const kept = suggestionsOf(list).filter((s) => s.status === 'kept');
  if (!kept.length) return '';
  return `<section data-ai-kept="1"><h3>${esc(heading)}</h3><ol>${kept.map((s) => `<li>${esc(s.text)}</li>`).join('')}</ol></section>`;
}
