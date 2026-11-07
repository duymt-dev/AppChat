// Preview SLA mặc định (TIP-023b R2.8): tên chính sách + trước / sau từng mục tiêu (phút) và quy tắc leo thang đổi. Chỉ đọc — chính sách mặc
// định chưa có (workspace mới) thì so với giá trị seed, execute mới tạo.
import type { ActionInput, ActionPreview, slaUpdateDefault } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { escalationOf } from '../../services/sla-clock';

export async function slaPreview(tx: TenantTx, i: ActionInput<typeof slaUpdateDefault>): Promise<ActionPreview> {
  const p = await tx.slaPolicy.findFirst({ where: { isDefault: true } });
  const cur = p ? { frt_ai: p.frtAiMin, frt_human: p.frtHumanMin, ttr_ai: p.ttrAiMin, ttr_human: p.ttrHumanMin, escalation: escalationOf(p) } : {};
  const esc = i.escalation ? { ...(p ? escalationOf(p) : {}), ...i.escalation } : undefined;
  return preview('config', p?.name ?? '', { changes: updated('sla_policy', p?.id ?? 'default', cur, { frt_ai: i.frt_ai, frt_human: i.frt_human, ttr_ai: i.ttr_ai, ttr_human: i.ttr_human, escalation: esc }) });
}
