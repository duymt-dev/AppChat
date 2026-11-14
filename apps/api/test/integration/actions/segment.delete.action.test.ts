// Ma trận segment.delete (TIP-037, delete, undo 24h): Trợ lý chỉ xem trước → xác nhận xoá mềm → hoàn tác khôi phục; sales / cs → 403;
// idempotency cùng khoá → một lần xoá; trạng thái: phân khúc còn nháp dùng → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { na } from '../helpers/action-matrix';
import { mkMatrix, type MkMatrix } from '../helpers/marketing-matrix';

let x: MkMatrix;
const seg = async (name: string) => (await x.m.seed('segment.create', { name, filter: { field: 'group', op: 'in', value: ['loyal'] } })).segment_id as string;
const gone = async (id: string) => (await (await x.m.db()).segment.findUniqueOrThrow({ where: { id } })).deletedAt !== null;

beforeAll(async () => {
  x = await mkMatrix('segment.delete');
}, 120_000);
afterAll(() => x?.close());

describe('segment.delete', () => {
  it('preview Trợ lý → xác nhận xoá mềm → hoàn tác khôi phục', async () => {
    const id = await seg('Xoá');
    const { preview, done } = await x.m.confirm({ segment_id: id });
    expect(preview.risk).toBe('delete');
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await gone(id)).toBe(true);
    expect((await x.m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await gone(id)).toBe(false);
  });

  it('sales / cs 403; idempotency cùng khoá → 200 hai lần, một lần xoá', async () => {
    const id = await seg('Idem');
    expect((await x.m.act({ segment_id: id }, x.m.sales)).status).toBe(403);
    expect((await x.m.act({ segment_id: id }, x.m.cs)).status).toBe(403);
    const a = await x.m.actWithKey('seg-del-key', { segment_id: id });
    const b = await x.m.actWithKey('seg-del-key', { segment_id: id });
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await (await x.m.db()).actionLog.count({ where: { actionId: 'segment.delete', status: 'succeeded', input: { path: ['segment_id'], equals: id } } })).toBe(1);
  });

  it('trạng thái: còn nháp dùng → 409', async () => {
    const id = await seg('Đang dùng');
    const k = await x.mk.contact({ zaloAccount: x.zalo });
    await x.mk.act('campaign.create', { name: 'Dùng', channel: 'zalo', account_id: x.zalo, segment_ids: [id], contact_ids: [k], content: { text: 'a' } });
    expect((await x.m.act({ segment_id: id })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(x.m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
