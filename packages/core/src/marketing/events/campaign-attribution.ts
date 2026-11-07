// Gán phản hồi / chuyển đổi cho chiến dịch (TIP-037, DC-240): consumer `marketing.attribution` (ROLE=jobs) nhận `message.received` (tin
// khách 1-1) và `order.completed` (đơn đã hoàn tất — không tính đơn huỷ) → action hệ thống campaign.record_metric qua Executor (Idempotency
// theo event: chạy lại không đếm hai lần). Quy tắc: last-touch — người nhận ĐÃ GỬI gần nhất của khách trong 7 ngày trước sự kiện; mỗi tin /
// đơn gán tối đa một chiến dịch; số tiền là tổng đơn (VND) ghi ở dòng người nhận, không sửa doanh số.
import type { EventConsumer } from '../../kernel/events/consumer';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { MARKETING_ACTORS, systemCtx } from '../services/marketing-system';

export const ATTRIBUTION_CONSUMER = 'marketing.attribution';

export const attributionConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: ATTRIBUTION_CONSUMER,
  topics: ['message.received', 'order.completed'],
  async handle(e) {
    const p = e.payload as { contact_id?: string | null; is_group?: boolean };
    if (!p.contact_id || p.is_group) return;
    const kind = e.topic === 'order.completed' ? 'conversion' : 'reply';
    await executor.execute(systemCtx(e.workspaceId, MARKETING_ACTORS.metric, `${e.id}:campaign-metric`), 'campaign.record_metric', { event_id: e.id, kind });
  },
});
