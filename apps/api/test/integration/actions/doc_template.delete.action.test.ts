// Ma trận doc_template.delete (TIP-023b): xoá mẫu (risk delete) → mẫu bị xoá mềm; mẫu mặc định của loại → 409 ở preview; undo khôi phục.
// 403 sales (không có documents.manage) · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let def: string;
let other: string;
const BODY = '<p>Kính gửi {{customer.name}}</p>';

beforeAll(async () => {
  m = await matrix('doc_template.delete');
  def = (await m.seed('doc_template.create', { kind: 'quote', name: 'Báo giá chuẩn', source: 'rich', body: BODY, is_default: true })).template_id;
  other = (await m.seed('doc_template.create', { kind: 'quote', name: 'Báo giá ngắn', source: 'rich', body: BODY })).template_id;
}, 120_000);
afterAll(() => m?.close());

describe('doc_template.delete', () => {
  it('403 sales · id lạ 404 · mẫu mặc định → 409', async () => {
    expect((await m.act({ template_id: other }, m.sales)).status).toBe(403);
    expect((await m.act({ template_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ template_id: def }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ template_id: 'is_default' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ template_id: other });
    expect(preview).toEqual({ summary: 'Báo giá ngắn', risk: 'delete', changes: [{ entity: 'doc_template', id: other, before: { kind: 'quote', name: 'Báo giá ngắn', source: 'rich', version: 1 } }] });
    expect(done.body.data.result).toEqual({ ok: true });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).docTemplate.findUniqueOrThrow({ where: { id: other } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
