// Worker ROLE=jobs: JobsModule theo bảng hàng đợi Blueprint §1.3. Đăng ký sẵn ở TIP-001 — TIP sau KHÔNG sửa danh sách domain;
// lịch phụ của domain khác role (TIP-037: MarketingSchedulerModule — worker gửi chiến dịch ở ROLE=channels) nằm ở JOBS_EXTRA.
import { Module } from '@nestjs/common';
import { IdentityJobsModule, AuthzJobsModule, BillingJobsModule, CrmJobsModule, CatalogJobsModule, SalesJobsModule, ContractsJobsModule, DocumentsJobsModule, IntegrationsJobsModule, BookingJobsModule, SupportJobsModule, LoyaltyJobsModule, InsightsJobsModule, NotifyJobsModule, PlatformJobsModule, MarketingSchedulerModule } from '@appchat/core';

export const JOBS_JOBS = [IdentityJobsModule, AuthzJobsModule, BillingJobsModule, CrmJobsModule, CatalogJobsModule, SalesJobsModule, ContractsJobsModule, DocumentsJobsModule, IntegrationsJobsModule, BookingJobsModule, SupportJobsModule, LoyaltyJobsModule, InsightsJobsModule, NotifyJobsModule, PlatformJobsModule];

export const JOBS_EXTRA = [MarketingSchedulerModule];

@Module({ imports: [...JOBS_JOBS, ...JOBS_EXTRA] })
export class JobsRoleModule {}
