// BullMQ processor của domain `identity` (worker ROLE=jobs): queue `tenant` — job `tenant.provision` (TIP-004).
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity.module';
import { TenantProvisionWorker } from './tenant-provision.processor';

@Module({ imports: [IdentityModule], providers: [TenantProvisionWorker] })
export class IdentityJobsModule {}
