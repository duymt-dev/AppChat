// TIP-023e §3.5: câu hỏi tự do của tool nhạy (`find_actions`) không bao giờ nằm lại trong `ai_run_step` — che TRƯỚC khi ghi, một
// điểm duy nhất (`RunStore.step()`) nên vết / GenUI / run-detail / SSE đọc lại đều an toàn tự động. Action khác giữ nguyên input.
import { describe, expect, it } from 'vitest';
import { redactSensitiveQueryInput, SENSITIVE_QUERY_TOOLS } from '../src/authz/fields/history-provenance';
import { RunStore } from '../src/ai/runs/run.store';

describe('redactSensitiveQueryInput', () => {
  it('find_actions: bỏ query, giữ module (metadata an toàn, không phải văn bản tự do)', () => {
    expect(redactSensitiveQueryInput('find_actions', { query: 'số điện thoại khách Nguyễn Văn A 0912345678', module: 'crm' })).toEqual({ query: '[redacted]', module: 'crm' });
    expect(redactSensitiveQueryInput('find_actions', { query: 'khách vip' })).toEqual({ query: '[redacted]' });
  });

  it('action khác / input rỗng / không có actionId → giữ nguyên', () => {
    const input = { action_id: 'contact.update', input: { contact_id: 'x' } };
    expect(redactSensitiveQueryInput('call_action', input)).toBe(input);
    expect(redactSensitiveQueryInput(null, { query: 'x' })).toEqual({ query: 'x' });
    expect(redactSensitiveQueryInput('find_actions', null)).toBeNull();
  });

  it('danh sách tool nhạy chỉ đăng ký tường minh — không tự suy theo tên', () => {
    expect([...SENSITIVE_QUERY_TOOLS]).toEqual(['find_actions']);
  });
});

function fakeDb() {
  const steps = new Map<string, { input: unknown }>();
  return {
    steps,
    aiRunStep: {
      findUnique: async ({ where }: { where: { runId_idx: { runId: string; idx: number } } }) => (steps.has(`${where.runId_idx.runId}:${where.runId_idx.idx}`) ? { id: 'x' } : null),
      upsert: async ({ where, create }: { where: { runId_idx: { runId: string; idx: number } }; create: { input: unknown } }) => {
        const key = `${where.runId_idx.runId}:${where.runId_idx.idx}`;
        if (!steps.has(key)) steps.set(key, { input: create.input });
        return steps.get(key)!;
      },
    },
    aiRun: {},
  };
}

describe('RunStore.step — che câu hỏi tự do trước khi ghi (TIP-023e §3.5)', () => {
  it('bước tool find_actions → input ghi xuống đã che query; bước tool khác giữ nguyên', async () => {
    const db = fakeDb();
    const store = new RunStore(db as never, () => new Date('2026-11-10T00:00:00Z'));
    await store.step('r1', { idx: 0, type: 'tool', actionId: 'find_actions', input: { query: 'email khách abc@domain.vn', module: 'crm' }, output: { kind: 'ok', output: { actions: [] } } });
    await store.step('r1', { idx: 1, type: 'tool', actionId: 'contact.search', input: { query: 'abc' }, output: { kind: 'ok', output: {} } });
    expect(db.steps.get('r1:0')!.input).toEqual({ query: '[redacted]', module: 'crm' });
    expect(db.steps.get('r1:1')!.input).toEqual({ query: 'abc' });
    expect(JSON.stringify([...db.steps.values()])).not.toContain('abc@domain.vn');
  });
});
