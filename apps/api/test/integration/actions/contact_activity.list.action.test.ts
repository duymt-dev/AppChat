// Ma trận contact_activity.list (TIP-026b §3): crm.view, read, agentGrantable=true — cùng reader với GET /contacts/:id/activities.
// Owner → trang; sales ngoài scope 404; activity_id không thuộc khách → rỗng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact_activity.list');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400003' })).contact_id;
  await m.seed('contact_task.create', { contact_id: contact, title: 'Việc ma trận' });
}, 120_000);
afterAll(() => m?.close());

describe('contact_activity.list', () => {
  it('Owner → việc; id không thuộc khách → rỗng', async () => {
    const r = await m.act({ contact_id: contact, kind: 'tasks' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.items).toEqual([expect.objectContaining({ title: 'Việc ma trận', state: 'open' })]);
    expect((await m.act({ contact_id: contact, kind: 'tasks', activity_id: uuidv7() })).body.data.result.items).toEqual([]);
  });
  it('sales ngoài scope 404', async () => {
    expect((await m.act({ contact_id: contact, kind: 'notes' }, m.sales)).status).toBe(404);
  });
  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
