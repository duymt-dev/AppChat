// BullMQ processor của domain `identity` (worker ROLE=jobs): queue `tenant` — một dispatcher cho `tenant.provision` (TIP-004) và
// `tenant.lifecycle` (archive / restore — TIP-041).
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity.module';
import { LifecycleModule } from '../lifecycle/lifecycle.module';
import { TenantQueueDispatcher } from '../lifecycle/dispatcher';

@Module({ imports: [IdentityModule, LifecycleModule], providers: [TenantQueueDispatcher] })
export class IdentityJobsModule {}
