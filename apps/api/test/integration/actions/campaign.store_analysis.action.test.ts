// Ma trận campaign.store_analysis (TIP-037, system-only — worker ROLE=ai sau run campaign.analyze): HTTP 403 / header system 422, ẩn khỏi
// Trợ lý. Nguồn system: run lạ → 404; run chưa xong → 409; actor khác → 403. Lưu gợi ý hợp lệ + trừ Credit một lần: marketing-analytics.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { na } from '../helpers/action-matrix';
import { expectSystemOnly, mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;

beforeAll(async () => {
  x = await mkMatrix('campaign.store_analysis');
}, 120_000);
afterAll(() => x?.close());

describe('campaign.store_analysis', () => {
  it('system-only: HTTP 403 / header system 422; ẩn khỏi Trợ lý', async () => {
    await expectSystemOnly(x.m, { run_id: uuidv7() });
  });

  it('nguồn system: run lạ → 404; run chưa xong → 409; actor khác → 403; không ghi gợi ý', async () => {
    await expect(x.mk.system('analysis', 'campaign.store_analysis', { run_id: uuidv7() })).rejects.toMatchObject({ httpStatus: 404 });
    const id = uuidv7();
    await (await x.m.db()).aiRun.create({ data: { id, kind: 'consult', rootRunId: id, title: 'campaign.analyze', status: 'running', initiatedByUserId: x.m.h.user } });
    await expect(x.mk.system('analysis', 'campaign.store_analysis', { run_id: id })).rejects.toMatchObject({ httpStatus: 409 });
    await expect(x.mk.system('metric', 'campaign.store_analysis', { run_id: id })).rejects.toMatchObject({ httpStatus: 403 });
    expect(await (await x.m.db()).campaignSuggestion.count()).toBe(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
