// Consumer outbox `channel.group_requested` (TIP-023b SPEC D): đẩy request vào hàng đợi tạo nhóm của đúng tài khoản — worker giữ lease của
// tài khoản đó mới mở hàng đợi này (create-group.processor), nên API không bao giờ gọi adapter chưa start. Job id = request id: đẩy lại an toàn.
import type { EventConsumer } from '../../kernel/events/consumer';
import type { GroupRequestQueue } from '../jobs/create-group.processor';

export function groupRequestConsumer(q: Pick<GroupRequestQueue, 'enqueue'>): EventConsumer {
  return {
    name: 'channels.group_request',
    topics: ['channel.group_requested'],
    async handle(e, db) {
      const id = String(e.payload.request_id ?? '');
      const r = await db.conversationGroupRequest.findUnique({ where: { id }, select: { id: true, channelAccountId: true, status: true } });
      if (!r || r.status !== 'queued') return;
      await q.enqueue(r.channelAccountId, { ws: e.workspaceId, request_id: r.id });
    },
  };
}
