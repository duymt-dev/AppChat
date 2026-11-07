// Ma trận contact.set_stage (TIP-023b): giai đoạn trước / sau; undo trả giai đoạn cũ; sales own → 404 (không lộ tồn tại); id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.set_stage');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.set_stage', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, stage: 'won' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef', stage: 'won' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, stage: 'consulting' });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh`, risk: 'write', changes: [{ entity: 'contact', id: k.contact_id, before: { stage: 'lead' }, after: { stage: 'consulting' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).stage).toBe('consulting');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).stage).toBe('lead');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
