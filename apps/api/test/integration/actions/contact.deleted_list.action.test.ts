// Ma trận contact.deleted_list (TIP-015f §5.3): thùng rác theo scope đọc hiện tại (không toàn workspace); crm.delete + crm.view; cursor
// seek (deleted_at DESC, id DESC); tìm theo tên không dấu / SĐT; trạng thái restorable → expired sau 30 ngày. Cùng reader với
// GET /v1/contacts/deleted.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { call, env } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const ids: string[] = [];

beforeAll(async () => {
  m = await matrix('contact.deleted_list');
  for (const [i, name] of ['Chị Ngọc Ánh', 'Anh Đức', 'Cô Hằng'].entries()) {
    const k = await m.seed('contact.create', { full_name: name, phone: `090966000${i}` });
    m.h.clock.advance(1000);
    await m.seed('contact.delete', { contact_id: k.contact_id });
    ids.push(k.contact_id);
  }
}, 120_000);
afterAll(() => m?.close());

describe('contact.deleted_list', () => {
  it('403 thiếu crm.delete', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('mới xoá trước, phân trang cursor, tìm không dấu / SĐT', async () => {
    const p1 = (await m.act({ limit: 2 })).body.data.result;
    expect(p1.data.map((r: { id: string }) => r.id)).toEqual([ids[2], ids[1]]);
    expect(p1.data[0]).toMatchObject({ status: 'restorable' });
    const p2 = (await m.act({ limit: 2, cursor: p1.next_cursor })).body.data.result;
    expect(p2.data.map((r: { id: string }) => r.id)).toEqual([ids[0]]);
    expect(p2.next_cursor).toBeNull();
    expect((await m.act({ q: 'ngoc anh' })).body.data.result.data.map((r: { id: string }) => r.id)).toEqual([ids[0]]);
    expect((await m.act({ q: '0909660001' })).body.data.result.data.map((r: { id: string }) => r.id)).toEqual([ids[1]]);
  });

  it('GET /v1/contacts/deleted cùng kết quả; cursor hỏng → 400', async () => {
    const r = await call(m.h, '/contacts/deleted?limit=1', undefined);
    const body = (await r.json()) as { data: { id: string }[]; next_cursor: string | null };
    expect(body.data.map((x) => x.id)).toEqual([ids[2]]);
    expect(body.next_cursor).toBeTruthy();
    expect((await call(m.h, '/contacts/deleted?cursor=zz', undefined)).status).toBe(400);
  });

  it('quá 30 ngày → expired', async () => {
    m.h.clock.advance(30 * 24 * 3600_000);
    const rows = (await m.act({})).body.data.result.data as { status: string }[];
    expect(rows.every((r) => r.status === 'expired')).toBe(true);
  });

  it('EXPLAIN: trang id thùng rác (all / own) dùng index một phần, không Seq Scan', async () => {
    const ws = await m.h.platform.workspace.findUniqueOrThrow({ where: { id: m.h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = async (sql: string, v: unknown[]) => (await c.query(`EXPLAIN ${sql}`, v)).rows.map((r) => r['QUERY PLAN']).join('\n');
      const all = await plan('SELECT c.id FROM contact c WHERE c.deleted_at IS NOT NULL AND c.merged_into_id IS NULL ORDER BY c.deleted_at DESC, c.id DESC LIMIT 31', []);
      expect(all).toMatch(/contact_deleted_recent_idx/);
      const own = await plan('SELECT c.id FROM contact c WHERE c.deleted_at IS NOT NULL AND c.merged_into_id IS NULL AND c.owner_user_id = $1::uuid ORDER BY c.deleted_at DESC, c.id DESC LIMIT 31', [m.sales.id]);
      expect(own).toMatch(/contact_deleted_owner_idx/);
      for (const p of [all, own]) expect(p).not.toMatch(/Seq Scan/);
    } finally {
      await c.end();
    }
  });

  it('ô không áp dụng có lý do', () => {
    for (const c of ['undo', 'idempotency', 'state', 'bulk'] as const) expect(na(m.def, c)).toBeTruthy();
  });
});
