// Ma trận action_log.add_correction (TIP-003e §4, REQ-E09c): đính chính hành động đã gửi — quyền ĐÚNG của action gốc (cs không có
// quote.send → 403), scope bản ghi gốc (sales own: báo giá của Owner → 404), log lạ → 404, log không phải send → 409; mỗi lần thêm một mục.
// Nguồn assistant qua xem trước. Đo song song + audit.view ở concurrency.test.ts (AC5).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const LOG = '0190f000-0000-7000-8000-0000000c0e11';

beforeAll(async () => {
  m = await matrix('action_log.add_correction');
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan ĐC', phone: '0909633001' })).contact_id;
  const q = await m.seed('quote.create', { contact_id: lan, items: [{ name: 'Gói ĐC', qty: 1, unit_price: '900000', tax_rate: 0 }] });
  await (await m.db()).actionLog.create({ data: { id: LOG, actionId: 'quote.send', risk: 'send', source: 'ui', actorType: 'user', actorId: m.h.user, input: { quote_id: q.quote_id, channel: 'email' }, result: { quote_id: q.quote_id }, status: 'succeeded' } });
}, 120_000);
afterAll(() => m?.close());

describe('action_log.add_correction', () => {
  it('403 cs (không có quote.send) · sales own ngoài scope → 404 · log lạ → 404', async () => {
    expect((await m.act({ action_log_id: LOG, note: 'x' }, m.cs)).status).toBe(403);
    expect((await m.act({ action_log_id: LOG, note: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ action_log_id: '0190f000-0000-7000-8000-00000000beef', note: 'x' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; lần sau thêm mục (không ghi đè)', async () => {
    const { preview, done } = await m.confirm({ action_log_id: LOG, note: 'Giá đúng 850.000đ' });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'action_log', id: LOG, after: { correction: 'Giá đúng 850.000đ' } }] });
    expect(done.body.data.result).toEqual({ action_log_id: LOG, corrections: 1 });
    expect((await m.act({ action_log_id: LOG, note: 'Đã gọi khách' })).body.data.result).toEqual({ action_log_id: LOG, corrections: 2 });
  });

  it('idempotency: cùng khoá gọi hai lần → một mục', async () => {
    const before = ((await (await m.db()).actionLog.findUniqueOrThrow({ where: { id: LOG } })).correction as unknown[]).length;
    const a = await m.actWithKey('corr-key-1', { action_log_id: LOG, note: 'Lặp' });
    const b = await m.actWithKey('corr-key-1', { action_log_id: LOG, note: 'Lặp' });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(((await (await m.db()).actionLog.findUniqueOrThrow({ where: { id: LOG } })).correction as unknown[]).length).toBe(before + 1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
