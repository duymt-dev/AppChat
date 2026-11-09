// TIP-015c pha 1 trên Postgres thật: preview → accept contact.forget. Owner-only (privacy.erase không cấp sales/cs → 403); xem trước
// BẮT BUỘC cho nguồn ui (MANDATORY_PREVIEW_ACTIONS, policy.ts) dù risk=delete bình thường chạy thẳng ở UI — gọi lần đầu luôn 202
// preview_required, phải xác nhận bằng confirm_token mới accept; preview của contact.forget tự kiểm blocker (assertNoOpenBlockers)
// nên có đơn mở thì NGAY Ở BƯỚC XEM TRƯỚC đã 409 HAS_DEPENDENCIES — khác contact.privacy_preview (action đọc thuần, luôn 200 kèm
// blockers). Đổi dữ liệu giữa preview → xác nhận (thêm ghi chú, không phải blocker) → 409 CONFLICT theo inventory_revision ở bước
// xác nhận (không âm thầm chốt theo bản cũ). Gọi lại cùng (contact, generation) → trả đúng operation cũ (idempotent accept), không
// tạo bản ghi thứ hai. contact.privacy_status đọc đúng phase/counts/version vừa ghi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { call as http } from './setup';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.forget');
}, 120_000);
afterAll(() => m?.close());

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const asHeader = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});
const create = async (name: string, phone: string) => (await m.seed('contact.create', { full_name: name, phone })).contact_id as string;
const call = (id: string, input: unknown, who?: { token: string }): Promise<Res> => http(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...asHeader(who) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const confirm = (id: string, input: unknown, token: string, who?: { token: string }): Promise<Res> => http(m.h, `/actions/${id}`, { input, confirm_token: token }, { 'idempotency-key': uuidv7(), ...asHeader(who) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const versionOf = async (id: string) => {
  const db = await m.db();
  return (await db.contact.findUniqueOrThrow({ where: { id } })).version;
};
const preview = (id: string, who?: { token: string }) => call('contact.privacy_preview', { contact_id: id }, who);
const opCount = async (id: string) => {
  const db = await m.db();
  const [row] = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "privacy_operation" WHERE "canonical_contact_id" = ${id}::uuid`;
  return Number(row!.n);
};

describe('contact.forget — chỉ Chủ sở hữu, xem trước bắt buộc', () => {
  it('sales / cs không có privacy.erase → 403 ở cả preview đọc và forget (ngay bước xem trước bắt buộc)', async () => {
    const id = await create('Chị Riêng Tư', '0909890001');
    expect((await preview(id, m.sales)).status).toBe(403);
    expect((await preview(id, m.cs)).status).toBe(403);
    const v = await versionOf(id);
    const pv = await preview(id);
    expect((await call('contact.forget', { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision }, m.sales)).status).toBe(403);
  });

  it('nguồn ui risk=delete vẫn bị ép xem trước (MANDATORY_PREVIEW_ACTIONS) — gọi lần đầu 202 preview_required, xác nhận token mới ra operation accepted', async () => {
    const id = await create('Chị Xem Trước', '0909890002');
    const v = await versionOf(id);
    const pv = await preview(id);
    expect(pv.status).toBe(200);
    expect(pv.body.data.result).toMatchObject({ canonical_contact_id: id, family_size: 1, removable_count: 1, irreversible: true, no_external_deletion: true, blockers: [] });
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const first = await call('contact.forget', input);
    expect(first.status, JSON.stringify(first.body)).toBe(202);
    expect(first.body.data.status).toBe('preview_required');
    expect(first.body.data.preview).toMatchObject({ risk: 'delete' });
    const done = await confirm('contact.forget', input, first.body.data.confirm_token);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result).toMatchObject({ phase: 'accepted' });
    expect(done.body.data.result.operation_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(done.body.data.undo_until).toBeUndefined();
  });
});

describe('contact.forget — chặn khi còn phụ thuộc (DC-262)', () => {
  it('privacy_preview (đọc thuần) vẫn 200 kèm blockers; contact.forget chặn NGAY ở bước xem trước bắt buộc → 409 HAS_DEPENDENCIES, không phát confirm_token, không ghi gì', async () => {
    const id = await create('Chị Đơn Mở', '0909890003');
    const ord = await call('order.create', { contact_id: id, items: [{ name: 'HIFU', qty: 1, unit_price: '1000000', tax_rate: 0 }] });
    expect(ord.status, JSON.stringify(ord.body)).toBe(200);
    const pv = await preview(id);
    expect(pv.status).toBe(200);
    expect(pv.body.data.result.blockers).toEqual([{ kind: 'open_order', count: 1 }]);
    const v = await versionOf(id);
    const r = await call('contact.forget', { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('HAS_DEPENDENCIES');
    expect(await opCount(id)).toBe(0);
  });
});

describe('contact.forget — dữ liệu đổi giữa preview và xác nhận', () => {
  it('thêm ghi chú (không phải blocker) sau khi lấy inventory_revision → xác nhận theo bản cũ bị 409 CONFLICT, không chốt âm thầm', async () => {
    const id = await create('Chị Đổi Giữa Lượt', '0909890004');
    const v = await versionOf(id);
    const pv = await preview(id);
    expect(pv.status).toBe(200);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const first = await call('contact.forget', input);
    expect(first.status).toBe(202);
    const note = await call('contact.add_note', { contact_id: id, body: 'ghi chú mới giữa lượt' });
    expect(note.status, JSON.stringify(note.body)).toBe(200);
    const done = await confirm('contact.forget', input, first.body.data.confirm_token);
    expect(done.status).toBe(409);
    expect(done.body.error.code).toBe('CONFLICT');
    expect(done.body.error.fields).toMatchObject({ inventory_revision: 'changed' });
    expect(await opCount(id)).toBe(0);
    const db = await m.db();
    expect((await db.contact.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });
});

describe('contact.forget — idempotent accept', () => {
  it('gọi lại cùng khách (cùng family_generation) → trả đúng operation cũ, không tạo bản ghi thứ hai', async () => {
    const id = await create('Chị Gọi Lại', '0909890005');
    const v = await versionOf(id);
    const pv = await preview(id);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const pv1 = await call('contact.forget', input);
    expect(pv1.status).toBe(202);
    const first = await confirm('contact.forget', input, pv1.body.data.confirm_token);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    const pv2 = await call('contact.forget', input);
    expect(pv2.status).toBe(202);
    const again = await confirm('contact.forget', input, pv2.body.data.confirm_token);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(again.body.data.result.operation_id).toBe(first.body.data.result.operation_id);
    expect(await opCount(id)).toBe(1);
  });
});

describe('contact.privacy_status — đọc tiến độ, không nội dung', () => {
  it('đọc đúng phase/counts/version vừa ghi; mã không tồn tại → 404', async () => {
    const id = await create('Chị Trạng Thái', '0909890006');
    const v = await versionOf(id);
    const pv = await preview(id);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const pvForget = await call('contact.forget', input);
    expect(pvForget.status).toBe(202);
    const r = await confirm('contact.forget', input, pvForget.body.data.confirm_token);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const opId = r.body.data.result.operation_id as string;
    const st = await call('contact.privacy_status', { operation_id: opId });
    expect(st.status, JSON.stringify(st.body)).toBe(200);
    expect(st.body.data.result).toMatchObject({ id: opId, phase: 'accepted', version: 1, counts: { total: 1, resolved: 0, retained: 0 }, retained_categories: [], unresolved_item_ids: [] });
    const missing = await call('contact.privacy_status', { operation_id: uuidv7() });
    expect(missing.status).toBe(404);
  });
});

describe('GET /v1/privacy/operations — danh sách, cùng guard privacy.erase (pha 4)', () => {
  const list = (qs: string, who?: { token: string }) => http(m.h, `/privacy/operations${qs}`, undefined, asHeader(who)).then(async (r) => ({ status: r.status, body: await r.json() }));
  const forgetOne = async (name: string, phone: string) => {
    const id = await create(name, phone);
    const v = await versionOf(id);
    const pv = await preview(id);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const pvForget = await call('contact.forget', input);
    const r = await confirm('contact.forget', input, pvForget.body.data.confirm_token);
    return r.body.data.result.operation_id as string;
  };

  it('sales / cs không có privacy.erase → 403', async () => {
    expect((await list('', m.sales)).status).toBe(403);
    expect((await list('', m.cs)).status).toBe(403);
  });

  it('phân trang keyset đi hết không trùng / không sót, limit lạ → 422', async () => {
    const ids = [await forgetOne('Chị Ds Một', '0909890101'), await forgetOne('Chị Ds Hai', '0909890102'), await forgetOne('Chị Ds Ba', '0909890103')];
    const seen: string[] = [];
    let cursor = '';
    for (let guard = 0; guard < 10; guard++) {
      const r = await list(`?limit=1${cursor}`);
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect(r.body.data.length).toBeLessThanOrEqual(1);
      seen.push(...r.body.data.map((x: { id: string }) => x.id));
      if (!r.body.next_cursor) break;
      cursor = `&cursor=${r.body.next_cursor}`;
    }
    for (const id of ids) expect(seen).toContain(id);
    expect(new Set(seen).size).toBe(seen.length);
    const bad = await list('?limit=0');
    expect(bad.status).toBe(422);
  });
});
