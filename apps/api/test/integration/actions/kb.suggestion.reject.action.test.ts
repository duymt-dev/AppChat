// Ma trận kb.suggestion.reject (TIP-043): từ chối đề xuất pending (risk write), không tạo nguồn; 403 sales; preview Trợ lý → xác nhận;
// CAS (version lệch → STALE_VERSION); đã từ chối → CONFLICT. Không agentGrantable. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { pendingSuggestion } from '../helpers/kb-suggestion-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('kb.suggestion.reject');
}, 120_000);
afterAll(() => m?.close());

describe('kb.suggestion.reject', () => {
  it('403 sales; không agentGrantable', async () => {
    const id = await pendingSuggestion(m, 'Có gói cặp đôi không?');
    expect((await m.act({ suggestion_id: id, if_version: 1 }, m.sales)).status).toBe(403);
    expect(m.def.agentGrantable).toBe(false);
  });

  it('preview Trợ lý → xác nhận; không nguồn; lần hai CONFLICT; version lệch STALE_VERSION', async () => {
    const id = await pendingSuggestion(m);
    expect((await m.act({ suggestion_id: id, if_version: 5 })).body.error.code).toBe('STALE_VERSION');
    const { preview, done } = await m.confirm({ suggestion_id: id, if_version: 1, reason: 'Thông tin cũ' });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'kb_suggestion', after: { status: 'rejected', reason: 'Thông tin cũ' } }] });
    expect(done.body.data.result).toEqual({ suggestion_id: id, status: 'rejected' });
    expect((await m.act({ suggestion_id: id, if_version: 2 })).status).toBe(409);
    const db = await m.db();
    expect(await db.kbSource.count({ where: { origin: 'conversation' } })).toBe(0);
    expect(await db.kbSuggestion.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'rejected', rejectReason: 'Thông tin cũ' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
