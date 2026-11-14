// Ma trận doc_template.create (TIP-023b): tạo mẫu soạn (risk config) → mẫu mới (loại · nguồn · mặc định nếu loại chưa có) + cảnh báo checklist
// pháp lý còn thiếu; biến lạ / không có biến → 422, mẫu .docx thiếu tệp → 422 ở preview. 403 sales (không có documents.manage).
// TIP-028b: hoàn tác 24h = xoá mềm khi chưa chứng từ nào dùng (đã dùng → 409 HAS_DEPENDENCIES — doc-render.test.ts).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const SRC = { 'x-action-source': 'assistant' };

beforeAll(async () => {
  m = await matrix('doc_template.create');
}, 120_000);
afterAll(() => m?.close());

describe('doc_template.create', () => {
  it('403 sales · biến lạ / thiếu biến / thiếu tệp → 422', async () => {
    expect((await m.act({ kind: 'quote', name: 'X', source: 'rich', body: '<p>{{customer.name}}</p>' }, m.sales)).status).toBe(403);
    expect((await m.act({ kind: 'quote', name: 'X', source: 'rich', body: '{{contract.value}}' }, undefined, SRC)).status).toBe(422);
    expect((await m.act({ kind: 'quote', name: 'X', source: 'rich', body: '<p>Chào</p>' }, undefined, SRC)).body.error.fields).toEqual({ body: 'no_vars' });
    expect((await m.act({ kind: 'contract', name: 'X', source: 'docx' }, undefined, SRC)).body.error.fields).toEqual({ file_id: 'required' });
  });

  it('preview Trợ lý → xác nhận', async () => {
    const r = await m.act({ kind: 'quote', name: 'Báo giá ngắn', source: 'rich', body: '<p>Kính gửi {{customer.name}}</p>' }, undefined, SRC);
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    const p = r.body.data.preview;
    expect(p).toMatchObject({ summary: 'Báo giá ngắn', risk: 'config', changes: [{ entity: 'doc_template', after: { kind: 'quote', name: 'Báo giá ngắn', source: 'rich' } }] });
    expect(typeof p.changes[0].after.is_default).toBe('boolean');
    expect(p.warnings === undefined || p.warnings.every((w: string) => w.startsWith('missing:'))).toBe(true);
    const { done } = await m.confirm({ kind: 'quote', name: 'Báo giá ngắn', source: 'rich', body: '<p>Kính gửi {{customer.name}}</p>' });
    const t = await (await m.db()).docTemplate.findUniqueOrThrow({ where: { id: done.body.data.result.template_id } });
    expect([t.name, t.source]).toEqual(['Báo giá ngắn', 'rich']);
    expect(done.body.data.undo_until).toBeTruthy();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).docTemplate.findUniqueOrThrow({ where: { id: t.id } })).deletedAt).not.toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
