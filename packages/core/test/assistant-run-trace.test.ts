// TIP-023b R1.4: vết run cho bộ câu thử model thật — chỉ run Trợ lý của chính người gọi (run người khác → 404, không xác nhận tồn tại),
// `call_action` tách ra action thật, input che bí mật, không trả nội dung tin / system prompt.
import { describe, expect, it } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { runTrace } from '../src/ai/assistant/run-trace.read';

const RUN = '0190a000-0000-7000-8000-000000000001';
const run = { id: RUN, kind: 'assistant', status: 'waiting_approval', input: { locale: 'vi', text: 'bí mật của khách' }, initiatedByUserId: 'u1', creditsUsed: 3 };
const steps = [
  { idx: 0, type: 'llm', actionId: null, input: {}, output: null, status: 'ok', provider: 'p', model: 'm-1', tokensIn: 120, tokensOut: 8 },
  { idx: 1, type: 'tool', actionId: 'call_action', input: { action_id: 'contact.update', input: { contact_id: 'x', password: 'hunter22' } }, output: { kind: 'needs_confirmation', preview: {} }, status: 'paused', provider: null, model: null, tokensIn: 0, tokensOut: 0 },
  { idx: 2, type: 'tool', actionId: 'find_actions', input: { query: 'khách' }, output: { kind: 'error', code: 'FORBIDDEN' }, status: 'error', provider: null, model: null, tokensIn: 0, tokensOut: 0 },
];
const db = (r: unknown) => ({ aiRun: { findUnique: async () => r }, aiRunStep: { findMany: async () => steps } }) as unknown as TenantDb;

describe('runTrace', () => {
  it('run của mình → bước tool / llm, action thật, bí mật đã che, có version + hash prompt', async () => {
    const t = await runTrace(db(run), 'u1', RUN);
    expect(t).toMatchObject({ run_id: RUN, status: 'waiting_approval', credits: 3, prompt: { name: 'assistant', locale: 'vi', hash: expect.stringMatching(/^[0-9a-f]{12}$/) } });
    expect(t.steps[0]).toEqual({ idx: 0, type: 'llm', status: 'ok', provider: 'p', model: 'm-1', tokens_in: 120, tokens_out: 8 });
    expect(t.steps[1]).toMatchObject({ type: 'tool', tool: 'call_action', action_id: 'contact.update', outcome: 'needs_confirmation', status: 'paused' });
    expect(JSON.stringify(t)).not.toContain('hunter22');
    expect(t.steps[2]).toMatchObject({ tool: 'find_actions', action_id: 'find_actions', outcome: 'error', error_code: 'FORBIDDEN' });
    expect(JSON.stringify(t)).not.toContain('bí mật của khách');
  });

  it.each([
    ['run người khác', { ...run, initiatedByUserId: 'u2' }, RUN],
    ['run không phải Trợ lý', { ...run, kind: 'delegate' }, RUN],
    ['không có run', null, RUN],
    ['id không phải uuid', run, 'abc'],
  ])('%s → NOT_FOUND', async (_n, r, id) => {
    await expect(runTrace(db(r), 'u1', id)).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
  });
});
