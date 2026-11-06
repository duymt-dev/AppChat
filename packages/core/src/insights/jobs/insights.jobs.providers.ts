// Provider việc nền insights (ROLE=jobs) — insights.jobs.module chỉ trải mảng này.
import type { Provider } from '@nestjs/common';
import { FollowUpSweeper } from './follow-up.consumer';

export const INSIGHTS_JOB_PROVIDERS: Provider[] = [FollowUpSweeper];
