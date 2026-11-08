// Ma trận contact.duplicate_candidates (TIP-015e §1.1–§1.2, AC1): cặp trùng CẢ HAI phía trong scope đọc hiện tại (Sales own không thấy cặp
// có khách người khác — kể cả khi khách của mình khớp email với khách ẩn); hạng luật email + tên > email > MST > tên (score_kind rule, không
// %); cursor ổn định, dữ liệu khớp đổi giữa chừng → 409 STALE_VERSION; khách đã xoá không vào cặp; không cắt 500. Cùng reader với
// GET /v1/contacts/duplicates/candidates. EXPLAIN 10k khách: nhánh email / MST / tên đi index biểu thức, không Seq Scan.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { call, env } from '../setup';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const id: Record<string, string> = {};
type Row = { key: string; rank: number; evidence: string[]; primary_id: string; score_kind: string; a: { id: string }; b: { id: string } };
const keys = (rows: Row[]) => rows.map((r) => r.key);
const pair = (x: string, y: string) => [id[x]!, id[y]!].sort().join('~');

beforeAll(async () => {
  m = await matrix('contact.duplicate_candidates');
  const mk = async (k: string, input: Record<string, unknown>, who = undefined as Parameters<Matrix['seed']>[2]) => {
    id[k] = (await m.seed('contact.create', input, who)).contact_id;
    m.h.clock.advance(1000);
  };
  await mk('lan1', { full_name: 'Nguyễn Thị Lan', phone: '0909770001', email: 'lan@spa.vn' });
  await mk('lan2', { full_name: 'Nguyen Thi Lan', phone: '0909770002' });
  await (await m.db()).contact.update({ where: { id: id.lan2 }, data: { email: 'LAN@spa.vn' } });
  await mk('tax1', { full_name: 'Công ty Hoa Mai', phone: '0909770003' });
  await mk('tax2', { full_name: 'Hoa Mai Co', phone: '0909770004' });
  // MST không có ở form tạo khách (đến từ nhập / hồ sơ DN) — ghi thẳng cột.
  await (await m.db()).contact.updateMany({ where: { id: { in: [id.tax1!, id.tax2!] } }, data: { taxCode: '0312345678' } });
  await mk('name1', { full_name: 'Trần Văn Bình', phone: '0909770005' });
  await mk('name2', { full_name: 'Tran Van Binh', phone: '0909770006' });
  // Khách của Sales (own) khớp email với khách của Owner → Sales KHÔNG thấy cặp này.
  // Tạo khách chặn trùng email chính xác → email trùng đến từ nhập / kênh: ghi thẳng DB (chỉ cột email) để dựng cặp.
  await mk('hid', { full_name: 'Phạm Mỹ', phone: '0909770007', email: 'my@spa.vn' });
  await mk('mine', { full_name: 'Phạm Mỹ Sales', phone: '0909770008' }, m.sales);
  await (await m.db()).contact.update({ where: { id: id.mine }, data: { email: 'my@spa.vn' } });
  await mk('mine2', { full_name: 'Lê Thu', phone: '0909770009' }, m.sales);
  await mk('mine3', { full_name: 'Le Thu', phone: '0909770010' }, m.sales);
  // Khách đã xoá không tạo cặp.
  await mk('gone', { full_name: 'Trần Văn Bình', phone: '0909770011' });
  await m.seed('contact.delete', { contact_id: id.gone });
}, 180_000);
afterAll(() => m?.close());

describe('contact.duplicate_candidates', () => {
  it('Owner: hạng luật, bằng chứng, bản chính = khách tạo trước, khách đã xoá không vào cặp', async () => {
    const rows = (await m.act({ limit: 50 })).body.data.result.data as Row[];
    const lan = rows.find((r) => r.key === pair('lan1', 'lan2'))!;
    expect(lan).toMatchObject({ score_kind: 'rule', rank: 4, primary_id: id.lan1 });
    expect(lan.evidence.sort()).toEqual(['email', 'name']);
    expect(rows.find((r) => r.key === pair('tax1', 'tax2'))).toMatchObject({ rank: 2, evidence: ['tax_code'] });
    expect(rows.find((r) => r.key === pair('name1', 'name2'))).toMatchObject({ rank: 1, evidence: ['name'] });
    expect(rows.find((r) => r.key === pair('hid', 'mine'))).toMatchObject({ rank: 3 });
    expect(rows.some((r) => r.a.id === id.gone || r.b.id === id.gone)).toBe(false);
    expect(rows.map((r) => r.rank)).toEqual([...rows.map((r) => r.rank)].sort((x, y) => y - x));
  });

  it('Sales own: chỉ cặp cả hai phía của mình — không lộ cặp có khách ẩn', async () => {
    const rows = (await m.act({}, m.sales)).body.data.result.data as Row[];
    expect(keys(rows)).toEqual([pair('mine2', 'mine3')]);
  });

  it('cursor ổn định không lặp / bỏ; dữ liệu khớp đổi → 409 STALE_VERSION; tìm theo tên', async () => {
    const all = keys((await m.act({ limit: 50 })).body.data.result.data);
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const r = (await m.act({ limit: 2, ...(cursor ? { cursor } : {}) })).body.data.result as { data: Row[]; next_cursor: string | null };
      seen.push(...keys(r.data));
      cursor = r.next_cursor;
    } while (cursor);
    expect(seen).toEqual(all);
    const p1 = (await m.act({ limit: 1 })).body.data.result;
    await m.seed('contact.update', { contact_id: id.name2, patch: { full_name: 'Trần Văn Bình Mới' } });
    const stale = await m.act({ limit: 1, cursor: p1.next_cursor });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'STALE_VERSION', fields: { cursor: 'stale' } });
    expect(keys((await m.act({ q: 'hoa mai' })).body.data.result.data)).toEqual([pair('tax1', 'tax2')]);
  });

  it('GET /v1/contacts/duplicates/candidates cùng reader; cursor hỏng → 400; CS (crm.view) đọc được', async () => {
    const r = await call(m.h, '/contacts/duplicates/candidates?limit=1', undefined);
    const body = (await r.json()) as { data: Row[]; next_cursor: string | null };
    expect(body.data).toHaveLength(1);
    expect(body.next_cursor).toBeTruthy();
    expect((await call(m.h, '/contacts/duplicates/candidates?cursor=zz', undefined)).status).toBe(400);
    expect((await m.act({}, m.cs)).status).toBe(200);
  });

  it('EXPLAIN 10k khách: tra khoá email / MST / tên (phía trong self-join) dùng index biểu thức, không Seq Scan', async () => {
    const ws = await m.h.platform.workspace.findUniqueOrThrow({ where: { id: m.h.ws } });
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${ws.dbName}$1`) });
    await c.connect();
    try {
      await c.query(`INSERT INTO contact (id, code, name, phone, phone_norm, email, tax_code, source, owner_user_id)
        SELECT gen_random_uuid(), 'KX' || g, 'Khach ' || g, '08' || lpad(g::text, 8, '0'), '+848' || lpad(g::text, 8, '0'),
               CASE WHEN g % 50 = 0 THEN 'dup' || (g / 100) || '@x.vn' ELSE 'k' || g || '@x.vn' END, CASE WHEN g % 70 = 0 THEN 'T' || (g / 140) END, 'manual', $1::uuid
        FROM generate_series(1, 10000) g`, [m.h.user]);
      expect(Number((await c.query('SELECT count(*) AS n FROM contact')).rows[0].n)).toBeGreaterThan(10_000);
      await c.query('SET enable_seqscan = off');
      const plan = async (sql: string) => (await c.query(`EXPLAIN ${sql}`)).rows.map((r) => r['QUERY PLAN']).join('\n');
      // Phía trong mỗi nhánh self-join = tra theo khoá của dòng ngoài; vai trò app không ANALYZE được bảng (không phải chủ) nên kiểm phép
      // tra khoá trực tiếp — không phụ thuộc thống kê.
      const email = await plan(`SELECT id FROM contact WHERE lower(email) = 'dup1@x.vn' AND email IS NOT NULL AND deleted_at IS NULL`);
      expect(email).toMatch(/contact_email_lower_idx/);
      const tax = await plan(`SELECT id FROM contact WHERE tax_code = 'T1' AND tax_code IS NOT NULL AND deleted_at IS NULL`);
      expect(tax).toMatch(/contact_tax_code_live_idx/);
      const name = await plan(`SELECT id FROM contact WHERE f_unaccent(lower(name)) = 'khach 1' AND deleted_at IS NULL`);
      expect(name).toMatch(/contact_name_key_live_idx/);
      for (const p of [email, tax, name]) expect(p).not.toMatch(/Seq Scan/);
    } finally {
      await c.end();
    }
  });

  it('ô không áp dụng có lý do', () => {
    for (const k of ['undo', 'idempotency', 'state', 'bulk'] as const) expect(na(m.def, k)).toBeTruthy();
  });
});
