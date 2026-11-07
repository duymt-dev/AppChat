// Sự kiện hoạt động tối thiểu của action (TIP-041 §1): executor ghi CÙNG transaction thành công với action_log → consumer vòng đời đẩy
// mốc hoạt động workspace. Chỉ id + nguồn (không input / kết quả / PII). Không phát cho nguồn `system` (job bảo trì / thống kê / quét lưu
// trữ không tự giữ workspace sống) và action đọc; replay idempotency không đi qua đây (trả kết quả cũ trước bước ghi).
import type { ActionDef } from '@appchat/actions';
import type { OutboxEventInput } from '../outbox/outbox';
import type { ActionContext } from './action-context';

export const WORKSPACE_ACTIVITY_TOPIC = 'workspace.activity';

export function activityEvent(ctx: Pick<ActionContext, 'source' | 'actor'>, def: Pick<ActionDef, 'risk'>, actionLogId: string): OutboxEventInput[] {
  if (ctx.source === 'system' || ctx.actor.type === 'system' || def.risk === 'read') return [];
  return [{ topic: WORKSPACE_ACTIVITY_TOPIC, payload: { action_log_id: actionLogId, source: ctx.source, actor_type: ctx.actor.type } }];
}
