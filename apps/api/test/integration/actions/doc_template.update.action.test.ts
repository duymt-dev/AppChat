// Ma trận doc_template.update (TIP-023b): sửa mẫu tài liệu (risk config) → tên / nội dung / mặc định trước / sau + phiên bản kế; biến lạ →
// 422, phiên bản cũ → 409 ở preview; undo về nội dung cũ. 403 sales (không có documents.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let tpl: string;
const row = async () => (await m.db()).docTemplate.findUniqueOrThrow({ where: { id: tpl } });

beforeAll(async () => {
  m = await matrix('doc_template.update');
  tpl = (await m.seed('doc_template.create', { kind: 'quote', name: 'Báo giá ngắn', source: 'rich', body: '<p>Kính gửi {{customer.name}}</p>' })).template_id;
}, 120_000);
afterAll(() => m?.close());

describe('doc_template.update', () => {
  it('403 sales · biến lạ → 422 · phiên bản cũ → 409', async () => {
    expect((await m.act({ template_id: tpl, name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ template_id: tpl, body: '{{contract.value}}' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
    expect((await m.act({ template_id: tpl, name: 'X', if_version: 9 }, undefined, { 'x-action-source': 'assistant' })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const v = (await row()).version;
    const { preview, done } = await m.confirm({ template_id: tpl, name: 'Báo giá dịch vụ' });
    expect(preview).toEqual({ summary: `Báo giá ngắn · v${v + 1}`, risk: 'config', changes: [{ entity: 'doc_template', id: tpl, before: { name: 'Báo giá ngắn' }, after: { name: 'Báo giá dịch vụ' } }] });
    expect(done.body.data.result).toEqual({ template_id: tpl, version: v + 1 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).name).toBe('Báo giá ngắn');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
