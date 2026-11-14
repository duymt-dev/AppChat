// TIP-023 AC4: route mock Trợ lý AI đúng shape đọc dùng chung với API thật (packages/shared/src/api/assistant.ts) — home, lượt,
// xác nhận, nhật ký hành động, khung điều phối (run đang sống / theo run gốc).
import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { actionLogsPageSchema, assistantConfirmSchema, assistantHomeSchema, assistantTurnSchema, runChildrenResponseSchema, runDetailResponseSchema, runStepsResponseSchema, runsListSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues;
};

describe('mock Trợ lý — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /assistant/home · /action-logs (lọc) · /runs (live + root_run_id)', async () => {
    expect(issues(assistantHomeSchema, await mockTransport.get('/assistant/home'))).toEqual([]);
    for (const q of [{}, { kind: 'create' }, { status: 'pending' }, { day: 'yesterday', q: 'báo' }]) expect(issues(actionLogsPageSchema, await mockTransport.get('/action-logs', q))).toEqual([]);
    const live = await mockTransport.get<z.infer<typeof runsListSchema>>('/runs', { status: 'live' });
    expect(issues(runsListSchema, live)).toEqual([]);
    expect(live.data.every((r) => r.status !== 'done')).toBe(true);
    expect(issues(runsListSchema, await mockTransport.get('/runs', { root_run_id: 'run_root_1' }))).toEqual([]);
  });

  it('GET /runs/:id · /steps · /children (TIP-019b) đúng schema; run không có → 404', async () => {
    for (const id of ['run_1', 'run_2', 'run_4']) {
      expect(issues(runDetailResponseSchema, await mockTransport.get(`/runs/${id}`))).toEqual([]);
      expect(issues(runStepsResponseSchema, await mockTransport.get(`/runs/${id}/steps`))).toEqual([]);
      expect(issues(runChildrenResponseSchema, await mockTransport.get(`/runs/${id}/children`))).toEqual([]);
    }
    await expect(mockTransport.get('/runs/nope')).rejects.toMatchObject({ status: 404 });
  });

  it('POST /assistant/messages → thẻ xác nhận → /assistant/confirm (xác nhận / huỷ)', async () => {
    const t = await mockTransport.post<z.infer<typeof assistantTurnSchema>>('/assistant/messages', { text: 'tạo báo giá cho chị Lan', mode: 'cowork' });
    expect(issues(assistantTurnSchema, t)).toEqual([]);
    const card = t.events.find((e) => e.type === 'confirm') as { confirm_token: string };
    expect(issues(assistantConfirmSchema, await mockTransport.post('/assistant/confirm', { confirm_token: card.confirm_token, decision: 'confirm' }))).toEqual([]);
    const t2 = await mockTransport.post<z.infer<typeof assistantTurnSchema>>('/assistant/messages', { text: 'tạo ticket', mode: 'cowork' });
    const c2 = t2.events.find((e) => e.type === 'confirm') as { confirm_token: string };
    expect(issues(assistantConfirmSchema, await mockTransport.post('/assistant/confirm', { confirm_token: c2.confirm_token, decision: 'cancel' }))).toEqual([]);
    expect(issues(assistantTurnSchema, await mockTransport.post('/assistant/messages', { text: 'tóm tắt hôm nay', mode: 'chat' }))).toEqual([]);
  });
});
