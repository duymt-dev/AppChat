// Ma trận contact.transfer_status (TIP-015d §2.8): crm.reassign, read, agentGrantable — cùng reader với GET /contacts/:id/transfers/:id.
// Owner (cả nguồn Trợ lý — đọc chạy luôn) → trạng thái + số đếm; sales thiếu crm.reassign → 403; transfer lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let transfer = '';

beforeAll(async () => {
  m = await matrix('contact.transfer_status');
  contact = (await m.seed('contact.create', { full_name: 'Khách trạng thái', phone: '0909400777' })).contact_id;
  transfer = (await m.seed('contact.transfer_owner', { contact_id: contact, to_user_id: m.sales.id, move: { conversations: true, quotes: true, appointments: true } })).transfer_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.transfer_status', () => {
  it('Owner (Trợ lý) → trạng thái applied + số đếm thật', async () => {
    const r = await m.act({ contact_id: contact, transfer_id: transfer }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ transfer_id: transfer, status: 'applied', to_user_id: m.sales.id, moved: { conversations: 0, quotes: 0, appointments: 0 }, items: [], next_cursor: null });
  });
  it('sales thiếu crm.reassign → 403; transfer lạ → 404', async () => {
    expect((await m.act({ contact_id: contact, transfer_id: transfer }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: contact, transfer_id: uuidv7() })).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
