// Preview kb.search (TIP-023b R2.8): action đọc không qua thẻ xác nhận ở bảng policy, nhưng UI / duyệt cần tóm tắt đúng nghĩa — câu tìm +
// phạm vi hiển thị (public / internal) theo người hiệu lực. Không gọi embedder, không trả đoạn tài liệu.
import type { ActionInput, ActionPreview, kbSearch } from '@appchat/actions';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';

/** Visibility theo người hiệu lực (rag §3, D54) — dùng chung execute (kb-search.handler.ts) và preview. */
export function kbVisibility(ctx: Pick<ActionContext, 'source' | 'onBehalfOfUserId' | 'authz'>): ('public' | 'internal')[] {
  if (ctx.source === 'agent' && !ctx.onBehalfOfUserId) return ['public'];
  return ctx.authz.isOwner || ctx.authz.permissions.has('kb.manage') ? ['public', 'internal'] : ['public'];
}

export function searchPreview(ctx: ActionContext, i: ActionInput<typeof kbSearch>): ActionPreview {
  return preview('read', line(i.query.slice(0, 120), kbVisibility(ctx).join('+')), { ...(i.limit ? { count: i.limit } : {}) });
}
