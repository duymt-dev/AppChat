// Ma trận contact.remember (TIP-015b): ghi fact; trùng văn bản → làm mới (cùng id); preview Trợ lý; sales ngoài scope → 404; cs (crm.edit,
// scope all) ghi được; fact nhạy cảm → 422; idempotency cùng khoá → một dòng. Luồng đủ (51 đồng thời, gộp, agent): contact-memory.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.remember');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Ghi', phone: '0909620001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.remember', () => {
  it('preview Trợ lý → xác nhận; lần hai cùng ý → refreshed', async () => {
    const { preview, done } = await m.confirm({ contact_id: lan, fact: 'Thích nhân viên Hoa làm', confidence: 0.7 });
    expect(preview).toMatchObject({ risk: 'write', summary: 'Chị Lan Ghi · Thích nhân viên Hoa làm', changes: [{ entity: 'contact_memory', after: { fact: 'Thích nhân viên Hoa làm', confidence: 0.7 } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const id = done.body.data.result.memory_id;
    const again = await m.act({ contact_id: lan, fact: 'thích nhân viên Hoa làm.' });
    expect(again.body.data.result).toEqual({ memory_id: id, status: 'refreshed', evicted_id: null });
    expect((await m.act({ contact_id: lan, fact: 'thích nhân viên Hoa làm' }, undefined, { 'x-action-source': 'assistant' })).body.data.preview.warnings).toEqual(['existing']);
  });

  it('scope / quyền / nhạy cảm', async () => {
    expect((await m.act({ contact_id: lan, fact: 'Thích trà' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: lan, fact: 'Thích trà' }, m.cs)).status).toBe(200);
    const r = await m.act({ contact_id: lan, fact: 'CMND 012345678' });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ fact: 'sensitive:id_number' });
  });

  it('idempotency: cùng khoá → cùng kết quả, một dòng', async () => {
    const key = uuidv7();
    const a = await m.actWithKey(key, { contact_id: lan, fact: 'Hay đặt lịch thứ 7' });
    const b = await m.actWithKey(key, { contact_id: lan, fact: 'Hay đặt lịch thứ 7' });
    expect(b.body.data.result).toEqual(a.body.data.result);
    expect(await (await m.db()).contactMemory.count({ where: { contactId: lan, fact: 'Hay đặt lịch thứ 7' } })).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
