// Ma trận kb.suggestion.approve (TIP-043): duyệt đề xuất pending (risk write) → đúng một nguồn origin conversation; 403 sales (không
// kb.manage); preview Trợ lý → xác nhận; CAS bắt buộc (version lệch → STALE_VERSION); đã duyệt → CONFLICT; cùng Idempotency-Key → cùng kết
// quả. Không agentGrantable. Undo: ActionDef không khai (sửa / xoá nguồn đã duyệt qua kb.update_source / kb.remove_source).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { pendingSuggestion } from '../helpers/kb-suggestion-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('kb.suggestion.approve');
}, 120_000);
afterAll(() => m?.close());

describe('kb.suggestion.approve', () => {
  it('403 sales; không agentGrantable', async () => {
    const id = await pendingSuggestion(m, 'Có chỗ gửi xe không?');
    expect((await m.act({ suggestion_id: id, if_version: 1 }, m.sales)).status).toBe(403);
    expect(m.def.agentGrantable).toBe(false);
  });

  it('preview Trợ lý → xác nhận → một nguồn conversation; lần hai CONFLICT', async () => {
    const id = await pendingSuggestion(m);
    const { preview, done } = await m.confirm({ suggestion_id: id, if_version: 1 });
    expect(preview.risk).toBe('write');
    expect(preview.changes.map((c: { entity: string }) => c.entity)).toEqual(['kb_suggestion', 'kb_source']);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ suggestion_id: id, status: 'approved', kb_source_id: expect.any(String) });
    expect((await m.act({ suggestion_id: id, if_version: 2 })).status).toBe(409);
    expect(await (await m.db()).kbSource.count({ where: { origin: 'conversation' } })).toBe(1);
  });

  it('version lệch → STALE_VERSION; id lạ → 404; cùng Idempotency-Key → cùng kết quả', async () => {
    const id = await pendingSuggestion(m, 'Có nhận thẻ không?');
    expect((await m.act({ suggestion_id: id, if_version: 9 })).body.error.code).toBe('STALE_VERSION');
    expect((await m.act({ suggestion_id: uuidv7(), if_version: 1 })).status).toBe(404);
    const key = uuidv7();
    const a = await m.actWithKey(key, { suggestion_id: id, if_version: 1 });
    const b = await m.actWithKey(key, { suggestion_id: id, if_version: 1 });
    expect(a.status).toBe(200);
    expect(b.body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
