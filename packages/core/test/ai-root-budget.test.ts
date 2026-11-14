// TIP-019b §2.2 (đơn vị): chi phí thô Decimal đúng (không float), khoá nhóm theo (run, loại, bước); mã lỗi cổng gốc → mã engine.
import { describe, expect, it } from 'vitest';
import { rawCost, usageGroupId } from '../src/ai/public';
import { attemptHooks } from '../src/ai/runs/attempt-hooks';

describe('usage receipts', () => {
  it('chi phí thô Decimal: 0,1 + 0,2 không sai số float; tổng hai lô 0,2 + 0,2 làm tròn một lần = 1', () => {
    const a = rawCost(100, 0, { per1kIn: 1, per1kOut: 0 });
    const b = rawCost(200, 0, { per1kIn: 1, per1kOut: 0 });
    expect(a.add(b).toString()).toBe('0.3');
    const lot = rawCost(150, 50, { per1kIn: 1, per1kOut: 1 });
    expect(lot.add(lot).ceil().toNumber()).toBe(1);
    expect(Math.ceil(lot.toNumber()) + Math.ceil(lot.toNumber())).toBe(2);
  });

  it('khoá nhóm tính tiền theo run + loại + bước', () => {
    expect(usageGroupId('r1', 'chat', 3)).toBe('r1:chat:3');
    expect(usageGroupId('r1', 'query_embed', 3)).not.toBe(usageGroupId('r1', 'chat', 3));
  });

  it('beforeTool: gốc đã huỷ → mã CANCELLED; hết ngân sách → BUDGET', async () => {
    const run = { id: 'r', rootRunId: 'r' } as never;
    const db = (status: string, budget: { observed: number; maxCredits: number; quarantined: boolean } | null) =>
      ({ aiRun: { findUnique: async () => ({ id: 'r', parentRunId: null, maxCredits: 10, subtreeCredits: 0, status }) }, aiRootBudget: { findUnique: async () => budget } }) as never;
    const meter = { assertBalance: async () => undefined, price: async () => ({ per1kIn: 1, per1kOut: 1 }), usage: null };
    const mk = (d: never) => attemptHooks({ db: d, meter, ws: 'w', run, source: 's', now: () => new Date(), signal: new AbortController().signal });
    await expect(mk(db('cancelled', null)).beforeTool()).rejects.toMatchObject({ code: 'CANCELLED' });
    await expect(mk(db('running', { observed: 10, maxCredits: 10, quarantined: false })).beforeTool()).rejects.toMatchObject({ code: 'BUDGET' });
    await expect(mk(db('running', { observed: 1, maxCredits: 10, quarantined: true })).beforeTool()).rejects.toMatchObject({ code: 'USAGE_UNKNOWN' });
    await expect(mk(db('running', { observed: 1, maxCredits: 10, quarantined: false })).beforeTool()).resolves.toBeUndefined();
  });
});
