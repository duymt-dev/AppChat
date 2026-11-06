// Provider việc nền insights (ROLE=jobs) — insights.jobs.module chỉ trải mảng này: lịch quét việc follow (pha 2), kind việc dữ liệu xuất 4
// danh sách (pha 3 — consumer `data_job.requested` + quét dang dở của DataJobsModule chạy kind này).
import type { Provider } from '@nestjs/common';
import { FollowUpSweeper } from './follow-up.consumer';
import { ListExportKinds } from './exports.worker';

export const INSIGHTS_JOB_PROVIDERS: Provider[] = [FollowUpSweeper, ListExportKinds];
