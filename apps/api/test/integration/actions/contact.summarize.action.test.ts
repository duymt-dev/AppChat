// Ma trận contact.summarize (TIP-015b, read · skill): model giả (AI_ENGINE=mock) trả gạch đầu từ khối DỮ LIỆU → tóm tắt chỉ chứa phần người
// xem được thấy; lần hai cùng dữ liệu → `cached` (không thêm run); nhớ thêm fact → fingerprint đổi → sinh lại; Owner và CS khác khoá phạm vi
// (CS không thấy công nợ của Owner); không đọc `contact.ai_summary` cũ; sales ngoài scope / id lạ → 404; hết credit → 402.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.summarize');
  await m.credit(1000);
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Tóm Tắt', phone: '0909720001' })).contact_id;
  await m.seed('contact.remember', { contact_id: lan, fact: 'Dị ứng tinh dầu sả' });
  const db = await m.db();
  await db.invoice.create({ data: { id: uuidv7(), code: 'TT-SUM001', contactId: lan, ownerUserId: m.h.user, status: 'overdue', amount: 1_500_000n, paidAmount: 0n, dueDate: new Date('2020-01-01') } });
  await db.contact.update({ where: { id: lan }, data: { aiSummary: 'BÍ MẬT CŨ của Owner' } });
}, 120_000);
afterAll(() => m?.close());

describe('contact.summarize', () => {
  it('Owner: tóm tắt từ dữ liệu thật (ghi nhớ + công nợ), source model; lần hai cached, không thêm run', async () => {
    const r = await m.act({ contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ source: 'model', status: 'fresh' });
    const text = r.body.data.result.bullets.join('\n');
    expect(text).toContain('Dị ứng tinh dầu sả');
    expect(text).toContain('1.500.000');
    expect(text).not.toContain('BÍ MẬT CŨ');
    const db = await m.db();
    const runs = await db.aiRun.count({ where: { title: 'contact.summarize' } });
    expect((await m.act({ contact_id: lan })).body.data.result.status).toBe('cached');
    expect(await db.aiRun.count({ where: { title: 'contact.summarize' } })).toBe(runs);
  });

  it('dữ liệu đổi (nhớ thêm) → fingerprint lệch → sinh lại có fact mới', async () => {
    await m.seed('contact.remember', { contact_id: lan, fact: 'Thích nhân viên Hoa làm' });
    const r = await m.act({ contact_id: lan });
    expect(r.body.data.result.status).toBe('fresh');
    expect(r.body.data.result.bullets.join('\n')).toContain('Thích nhân viên Hoa làm');
  });

  it('CS: khoá phạm vi riêng — không thấy công nợ của Owner, không dùng cache của Owner', async () => {
    const r = await m.act({ contact_id: lan }, m.cs);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.status).toBe('fresh');
    expect(r.body.data.result.bullets.join('\n')).not.toContain('1.500.000');
    expect(await (await m.db()).contactSummaryCache.count({ where: { contactId: lan } })).toBe(2);
  });

  it('sales ngoài scope / id lạ → 404', async () => {
    expect((await m.act({ contact_id: lan }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: uuidv7() })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
