// Tiếp tục run sau thao tác nền tảng đã duyệt (TIP-045b annex A1): kernel phát `operation.completed` (cùng biên nhận tenant, kết quả chuẩn
// đã lưu vào approval_request.result trong CÙNG transaction tiêu thụ duyệt). Consumer này chỉ đẩy lại job `ai-resume` của duyệt — job đọc
// kết quả đã lưu (không chạy action lần hai) rồi chạy tiếp run một lần (claim waiting_approval). Kernel không import AI; AI nghe event chung.
import { Inject, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { eventConsumers, registerEventConsumer, unregisterEventConsumer, type EventConsumer } from '../../kernel/events/consumer';
import { ResumeQueue } from './resume.queue';

export const OPERATION_CONTINUATION_CONSUMER = 'ai.operation-continuation';

export function operationContinuationConsumer(queue: Pick<ResumeQueue, 'push'>): EventConsumer {
  return {
    name: OPERATION_CONTINUATION_CONSUMER,
    topics: ['operation.completed'],
    async handle(e) {
      const approvalId = e.payload.approval_id;
      if (typeof approvalId === 'string' && approvalId) await queue.push(e.workspaceId, approvalId, `op-${String(e.payload.operation_id)}`);
    },
  };
}

/** Đăng ký consumer một lần mỗi tiến trình (chỉ ROLE=jobs có worker `events` nên chỉ ở đó chạy thật). */
export class OperationContinuationInstaller implements OnApplicationBootstrap, OnApplicationShutdown {
  private mine: EventConsumer | null = null;

  constructor(@Optional() @Inject(ResumeQueue) private readonly queue: ResumeQueue | null) {}

  onApplicationBootstrap(): void {
    if (!this.queue || eventConsumers().some((c) => c.name === OPERATION_CONTINUATION_CONSUMER)) return;
    this.mine = operationContinuationConsumer(this.queue);
    registerEventConsumer(this.mine);
  }

  onApplicationShutdown(): void {
    if (this.mine && eventConsumers().includes(this.mine)) unregisterEventConsumer(OPERATION_CONTINUATION_CONSUMER);
  }
}
