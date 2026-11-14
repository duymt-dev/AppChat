// Preview contact.search (TIP-023b R2.8): điều kiện tra + số khách khớp trong scope (cùng `listContactIds` với màn Khách hàng). Không trả tên /
// SĐT khách trong preview — chỉ đếm.
import type { ActionInput, ActionPreview, contactSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { listContactIds } from '../../repos/contacts.repo';

export async function searchPreview(ctx: ActionContext, i: ActionInput<typeof contactSearch>, tx: TenantTx): Promise<ActionPreview> {
  const { total } = await listContactIds(tx, ctx.authz, { ...(i.q ? { q: i.q } : {}), ...(i.stage ? { stage: i.stage } : {}), ...(i.group ? { group: i.group } : {}) }, { offset: 0, limit: 1 });
  return preview('read', line(i.q, i.stage, i.group), { count: total });
}
