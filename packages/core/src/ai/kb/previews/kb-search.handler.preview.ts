// Preview kb.search (TIP-023b R2.8): action đọc không qua thẻ xác nhận ở bảng policy, nhưng UI / duyệt cần tóm tắt đúng nghĩa — câu tìm +
// trần hiển thị (public / internal) theo người hiệu lực. Không gọi embedder, không trả đoạn tài liệu. TIP-020c: trần này chỉ để HIỂN THỊ;
// quyền thật theo từng nguồn (scope/authority.ts) — `kb.manage` không còn là quyền đọc internal toàn kho.
import type { ActionInput, ActionPreview, kbSearch } from '@appchat/actions';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { internalRights } from '../scope/authority';

/** Trần hiển thị: agent trực kênh → public; người đọc được ít nhất một nhóm nguồn internal → public + internal. */
export function kbVisibility(ctx: Pick<ActionContext, 'source' | 'onBehalfOfUserId' | 'authz'>): ('public' | 'internal')[] {
  if (ctx.source === 'agent' && !ctx.onBehalfOfUserId) return ['public'];
  const x = internalRights(ctx.authz);
  return x.documents || x.catalog || x.inbox ? ['public', 'internal'] : ['public'];
}

export function searchPreview(ctx: ActionContext, i: ActionInput<typeof kbSearch>): ActionPreview {
  return preview('read', line(i.query.slice(0, 120), kbVisibility(ctx).join('+')), { ...(i.limit ? { count: i.limit } : {}) });
}
