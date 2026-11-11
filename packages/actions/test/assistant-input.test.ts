// TIP-023f §1.2, §5.3: 4 action đầu vào Trợ lý — assistant.use, ghi không agentGrantable, input đúng khuôn (không nhận tên / mime /
// nội dung từ client), read giới hạn 1..8.
import { describe, expect, it } from 'vitest';
import { registry } from '../src';

const get = (id: string) => registry.find((a) => a.id === id)!;
const U = '0190f000-0000-7000-8000-000000000021';

describe('assistant input actions', () => {
  it('đăng ký đủ, quyền + rủi ro + agentGrantable', () => {
    for (const [id, risk] of [['assistant.attachment_prepare', 'write'], ['assistant.attachment_remove', 'write'], ['assistant.attachment_get', 'read'], ['assistant.attachment_read', 'read']] as const) {
      expect(get(id), id).toMatchObject({ module: 'ai', permission: 'assistant.use', risk, agentGrantable: false, invalidates: [] });
      expect(get(id).description).toMatch(/Example: \{/);
    }
  });

  it('prepare không nhận tên / mime / digest từ client (strip)', () => {
    const out = get('assistant.attachment_prepare').input.parse({ file_id: U, draft_nonce: U, name: 'x.pdf', mime: 'application/pdf', digest: 'abc' });
    expect(out).toEqual({ file_id: U, draft_nonce: U });
  });

  it('read: limit 1..8, revision ≥ 1', () => {
    const r = get('assistant.attachment_read').input;
    expect(r.safeParse({ artifact_id: U, revision: 1, limit: 8 }).success).toBe(true);
    expect(r.safeParse({ artifact_id: U, revision: 1, limit: 9 }).success).toBe(false);
    expect(r.safeParse({ artifact_id: U, revision: 0 }).success).toBe(false);
  });
});
