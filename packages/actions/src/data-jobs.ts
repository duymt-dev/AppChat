// data_job.cancel · data_job.retry (TIP-045b annex D) — việc dữ liệu nặng chạy nền (xuất > 5.000 dòng, sửa hàng loạt > 50). Chỉ người tạo
// việc (handler kiểm actor + quyền của action gốc). Huỷ hợp tác ở ranh giới bản ghi: phần đã ghi không bị "hoàn tác giả". Thử lại chỉ
// các bản ghi lỗi có thể thử lại, cùng input (hash) — không tạo ghi thêm cho bản ghi đã xong.
import { z } from 'zod';
import { defineAction } from './define';

const jobId = z.string().uuid();

export const dataJobCancel = defineAction({
  id: 'data_job.cancel',
  module: 'settings',
  title: 'actions.data_job.cancel.title',
  description: 'Cancel a running background data job (export / bulk update) you started. Records already processed stay processed. Example: {"job_id":"0190f000-0000-7000-8000-000000000003"}',
  input: z.object({ job_id: jobId }),
  output: z.object({ status: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});

export const dataJobRetry = defineAction({
  id: 'data_job.retry',
  module: 'settings',
  title: 'actions.data_job.retry.title',
  description: 'Retry the failed items of a finished background data job you started (same input). Example: {"job_id":"0190f000-0000-7000-8000-000000000003"}',
  input: z.object({ job_id: jobId }),
  output: z.object({ status: z.string(), retried: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['data-jobs'],
});
