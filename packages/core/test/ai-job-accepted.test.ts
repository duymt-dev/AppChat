// TIP-032b nền 202 `job_accepted`: helper dựng phản hồi + phát lại từ idempotency (mã 202) — gửi lại cùng khoá trả đúng handle, không
// nhầm với 200; read-dispatch đổi 202 job_accepted → ToolOutcome `job_accepted` (không phải needs_approval / ok); kết quả tool cho model là
// "accepted, chưa xong" có handle (packages/ai/test/job-accepted-result.test.ts).
import { describe, expect, it } from 'vitest';
import { acceptedResponse, jobAccepted, replayAccepted } from '../src/kernel/actions/job-accepted';
import { acceptedOutcome } from '../src/ai/assistant/read-dispatch';

describe('202 job_accepted', () => {
  it('jobAccepted → acceptedResponse có job_id / action_log_id / status_url; replay chỉ khi mã 202 + đúng discriminant', () => {
    const a = jobAccepted('job-1', '/v1/product-imports/job-1').accepted!;
    const r = acceptedResponse('log-1', a);
    expect(r).toEqual({ status: 'job_accepted', job_id: 'job-1', action_log_id: 'log-1', status_url: '/v1/product-imports/job-1' });
    expect(replayAccepted(202, r)).toEqual(r);
    expect(replayAccepted(200, r)).toBeNull();
    expect(replayAccepted(202, { result: {} })).toBeNull();
    expect(replayAccepted(null, r)).toBeNull();
  });

  it('read-dispatch: job_accepted → ToolOutcome job_accepted; preview / approval giữ nguyên', () => {
    expect(acceptedOutcome({ status: 'job_accepted', job_id: 'j', action_log_id: 'l', status_url: '/v1/x/j' }, {})).toEqual({ kind: 'job_accepted', jobId: 'j', actionLogId: 'l', statusUrl: '/v1/x/j' });
    expect(acceptedOutcome({ status: 'approval_required', approval_id: 'a' }, {})).toEqual({ kind: 'needs_approval', approvalId: 'a' });
  });
});
