// TIP-023g §1.2, §3.6, §4.3 (AC3, AC5): quyền nguồn kiểm TRƯỚC model — không quyền / không thấy → không run, không binding; mất quyền sau
// khi công bố → đọc lại vô hiệu đề xuất (không trả kết quả cũ); dừng cứng (credit / huỷ) không thành đề xuất; ý định không phải đề xuất
// không đi đường proposal.
import { describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { proposeForRecord, readProposal } from '../src/ai/assistant/record-intent/recovery';
import { P1, P2, recordHarness } from './fixtures/record-ai-harness';

const RID = '0190f000-0000-7000-8000-0000000002f1';
const RID2 = '0190f000-0000-7000-8000-0000000002f2';
const ok = JSON.stringify({ name: 'Combo', rationale: '', items: [{ product_id: P1, qty: 1 }], unresolved: [] });
const status = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as AppError).httpStatus;
  }
  return 200;
};

describe('quyền trước model', () => {
  it('thiếu quyền → 403; bản ghi không thấy → 404; cả hai: 0 lời gọi model, 0 binding', async () => {
    const h = recordHarness();
    h.revokeAll();
    expect(await status(proposeForRecord(h.deps, h.turn(), { entity: 'product', entity_id: P1, intent: 'product_combo', request_id: RID }))).toBe(403);
    h.setRole('owner');
    h.hidden.add(P2);
    expect(await status(proposeForRecord(h.deps, h.turn(), { entity: 'product', entity_id: P2, intent: 'product_combo', request_id: RID2 }))).toBe(404);
    expect(h.calls).toBe(0);
    expect(h.rows).toEqual([]);
  });

  it('mất quyền nguồn sau khi công bố → đọc lại vô hiệu, không trả đề xuất cũ', async () => {
    const h = recordHarness({ results: [{ status: 'completed', text: ok }] });
    const out = await proposeForRecord(h.deps, h.turn(), { entity: 'product', entity_id: P1, intent: 'product_combo', request_id: RID });
    expect(out.state).toBe('validated');
    const t = h.turn();
    expect((await readProposal(h.deps, t, RID)).state).toBe('validated');
    h.hidden.add(P1);
    const again = await readProposal(h.deps, t, RID);
    expect(again).toMatchObject({ state: 'invalidated', reason: 'source_unavailable' });
    expect(again.combo).toBeUndefined();
  });

  it('dừng cứng (credit hết / huỷ) không thành đề xuất; request của người khác → 404', async () => {
    const h = recordHarness({ results: [{ status: 'failed', error: { code: 'CREDIT_EXHAUSTED', message: '' } }, { status: 'cancelled' }] });
    const a = await proposeForRecord(h.deps, h.turn(), { entity: 'product', entity_id: P1, intent: 'product_combo', request_id: RID });
    const b = await proposeForRecord(h.deps, h.turn(), { entity: 'product', entity_id: P1, intent: 'product_combo', request_id: RID2 });
    expect(a).toMatchObject({ state: 'failed', reason: 'CREDIT_EXHAUSTED' });
    expect(b).toMatchObject({ state: 'invalidated', reason: 'cancelled' });
    expect(a.combo ?? b.combo).toBeUndefined();
    const stranger = { ...h.turn(), userId: '0190f000-0000-7000-8000-00000000dead' };
    expect(await status(readProposal(h.deps, stranger, RID))).toBe(404);
  });
});
