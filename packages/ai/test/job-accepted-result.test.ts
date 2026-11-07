// TIP-032b: kết quả tool `job_accepted` gửi cho model là "đã nhận, CHƯA xong" kèm handle — engine không dừng chờ người, model không coi đó
// là kết quả cuối và không gọi lại tool để lấy tiến độ.
import { describe, expect, it } from 'vitest';
import { resultPart } from '../src/gateway/messages';

describe('resultPart job_accepted', () => {
  it('accepted + completed false + job_id / action_log_id / status_url', () => {
    const part = resultPart({ toolCallId: 't1', toolName: 'call_action', input: {} }, { kind: 'job_accepted', jobId: 'j', actionLogId: 'l', statusUrl: '/v1/x/j' });
    expect(part).toEqual({ type: 'tool-result', toolCallId: 't1', toolName: 'call_action', output: { type: 'json', value: { accepted: true, completed: false, job_id: 'j', action_log_id: 'l', status_url: '/v1/x/j' } } });
  });
});
