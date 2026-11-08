// TIP-015f §2.5–§2.8 trên Postgres thật: sau khi xoá khách, mọi writer tạo nghiệp vụ / quan hệ MỚI (báo giá, đơn, hợp đồng, đề nghị thanh toán,
// ghi chú / việc / cơ hội, ghi nhớ) → 404 (khách gốc khoá trước, đọc lại sau khoá). Tranh chấp xoá ↔ tạo đơn: khoá khách gốc tuần tự — hoặc
// xoá thắng (tạo đơn 404) hoặc tạo đơn thắng (xoá 409 HAS_DEPENDENCIES), không bao giờ có đơn mở trên khách đã xoá. Khôi phục → tạo lại được.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { call as http } from './setup';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;
const item = { name: 'HIFU', qty: 1, unit_price: '1000000', tax_rate: 0 };

beforeAll(async () => {
  m = await matrix('contact.delete');
}, 120_000);
afterAll(() => m?.close());

const create = async (name: string, phone: string) => (await m.seed('contact.create', { full_name: name, phone })).contact_id as string;
const call = (id: string, input: unknown) => http(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any

describe('khách đã xoá không nhận nghiệp vụ mới', () => {
  it('báo giá / đơn / hợp đồng / đề nghị thanh toán / ghi chú / việc / cơ hội / ghi nhớ → 404', async () => {
    const id = await create('Chị Đã Xoá', '0909880001');
    expect((await m.act({ contact_id: id })).status).toBe(200);
    const attempts: [string, unknown][] = [
      ['quote.create', { contact_id: id, items: [item] }],
      ['order.create', { contact_id: id, items: [item] }],
      ['contract.create', { contact_id: id, kind: 'service', title: 'Gói năm', value: '1000000' }],
      ['invoice.create', { contact_id: id, kind: 'full', amount: '500000' }],
      ['contact.add_note', { contact_id: id, body: 'ghi chú' }],
      ['contact_task.create', { contact_id: id, title: 'gọi lại' }],
      ['contact_opportunity.create', { contact_id: id, title: 'cơ hội' }],
      ['contact.remember', { contact_id: id, fact: 'thích buổi sáng' }],
    ];
    for (const [action, input] of attempts) {
      const r = await call(action, input);
      expect(r.status, `${action} ${JSON.stringify(r.body)}`).toBe(404);
    }
    expect(await (await m.db()).order.count({ where: { contactId: id } })).toBe(0);
  });

  it('khôi phục → tạo đơn lại được', async () => {
    const id = await create('Chị Khôi Phục', '0909880002');
    expect((await m.act({ contact_id: id })).status).toBe(200);
    expect((await call('contact.restore', { contact_id: id })).status).toBe(200);
    expect((await call('order.create', { contact_id: id, items: [item] })).status).toBe(200);
  });

  it('tranh chấp xoá ↔ tạo đơn: không có đơn mở trên khách đã xoá', async () => {
    for (let i = 0; i < 4; i++) {
      const id = await create(`Chị Đua ${i}`, `090988010${i}`);
      const [del, ord] = await Promise.all([m.act({ contact_id: id }), call('order.create', { contact_id: id, items: [item] })]);
      const db = await m.db();
      const c = await db.contact.findUniqueOrThrow({ where: { id } });
      const open = await db.order.count({ where: { contactId: id, status: { in: ['new', 'processing'] }, deletedAt: null } });
      if (c.deletedAt) {
        expect(open, `vòng ${i}`).toBe(0);
        expect(del.status).toBe(200);
        expect(ord.status).toBe(404);
      } else {
        expect(open).toBe(1);
        expect(del.body.error?.code).toBe('HAS_DEPENDENCIES');
      }
    }
  });
});
