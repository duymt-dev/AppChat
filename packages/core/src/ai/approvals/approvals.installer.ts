// Gắn cổng duyệt vào ActionExecutor lúc boot (DC-011): kernel không phụ thuộc domain `ai` → domain gọi `setApprovals`. Có ở mọi
// tiến trình nạp AiModule (api + worker ROLE=ai — job `ai-resume` chạy action đã duyệt qua executor).
import { Inject, Optional, type OnModuleInit } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ActionExecutor } from '../../kernel/actions/executor';
import { ActionHandlerRegistry } from '../../kernel/actions/handler-registry';
import { REDIS, type KeyValueStore } from '../../kernel/redis';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { DbApprovalGateway } from './approval.gateway';
import { ResumeQueue } from './resume.queue';

export class ApprovalsInstaller implements OnModuleInit {
  constructor(
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | undefined,
    @Optional() @Inject(ActionHandlerRegistry) private readonly handlers: ActionHandlerRegistry | undefined,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | undefined,
    @Optional() @Inject(REDIS) private readonly kv: KeyValueStore | undefined,
    @Optional() @Inject(ResumeQueue) private readonly queue: ResumeQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    const { executor, handlers, tenants, kv } = this;
    if (!executor || !handlers || !tenants || !kv) return;
    const queue = this.queue;
    const now = () => this.clock.now();
    executor.setApprovals(new DbApprovalGateway({ resolver: tenants, handlers, kv, now, ...(queue ? { expire: (ws, id, at) => queue.expireAt(ws, id, at, now()) } : {}) }));
  }
}
