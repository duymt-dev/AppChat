// Worker ROLE=jobs: JobsModule theo bảng hàng đợi Blueprint §1.3. Đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa.
import { Module } from '@nestjs/common';
import { IdentityJobsModule, AuthzJobsModule, BillingJobsModule, CrmJobsModule, CatalogJobsModule, SalesJobsModule, ContractsJobsModule, DocumentsJobsModule, IntegrationsJobsModule, BookingJobsModule, SupportJobsModule, LoyaltyJobsModule, InsightsJobsModule, NotifyJobsModule, PlatformJobsModule } from '@appchat/core';

export const JOBS_JOBS = [IdentityJobsModule, AuthzJobsModule, BillingJobsModule, CrmJobsModule, CatalogJobsModule, SalesJobsModule, ContractsJobsModule, DocumentsJobsModule, IntegrationsJobsModule, BookingJobsModule, SupportJobsModule, LoyaltyJobsModule, InsightsJobsModule, NotifyJobsModule, PlatformJobsModule];

@Module({ imports: JOBS_JOBS })
export class JobsRoleModule {}
