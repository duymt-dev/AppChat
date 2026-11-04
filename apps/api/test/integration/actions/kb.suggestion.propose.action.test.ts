// Ma trận kb.suggestion.propose (TIP-043): callback system-only của job đề xuất (ROLE=ai). HTTP (ui / assistant) → 403 dù là Owner; header
// system → 422; ẩn khỏi Trợ lý + tool agent. Luồng thật (lặp 10 lần → một pending, che PII, event chỉ id): kb-suggestions.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let input: Record<string, unknown>;

beforeAll(async () => {
  m = await matrix('kb.suggestion.propose');
  const c = await m.conv();
  input = { conversation_id: c.id, cutoff_message_id: c.message, run_id: null, pairs: [{ question: 'Q?', answer: 'A.', source_message_ids: [c.message] }] };
}, 120_000);
afterAll(() => m?.close());

describe('kb.suggestion.propose', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; sales 403; không ghi đề xuất', async () => {
    expect((await m.act(input)).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act(input, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect((await m.act(input, m.sales)).status).toBe(403);
    expect(await (await m.db()).kbSuggestion.count()).toBe(0);
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('kb.suggestion.propose')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
