// TIP-032d pha 1 (Postgres 16 thật + bundle validator đóng gói thật): tải tệp lên kèm đích (order / invoice) → staging riêng tư → gắn (kiểm
// cấu trúc trong tiến trình con cô lập ở `prepare`, ngoài transaction) → liệt kê trang keyset → tải về đúng bytes, `no-store` → gỡ (tệp
// giữ nguyên). Quyền: người tải lên / Owner không còn là đường tắt sau khi tệp thuộc bản ghi; link ký raw từ chối tệp bản ghi. Một tệp
// một cha (file_claim), gửi lại gắn → biên nhận cũ, revision lệch → 409, tệp hỏng → 422, thiếu bundle → 503. Chứng từ đã sinh (PDF đề
// nghị) liệt kê chỉ đọc, không gỡ được. Tiền / trạng thái / version của cha không đổi. EXPLAIN 100k dùng index một phần.
import 'reflect-metadata';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENC_KEY, setValidatorEntry, signedFileUrl, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { badDocx, benignDocx, pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let order: string;
let otherOrder: string;
let invoice: string;
const api = join(import.meta.dirname, '..', '..');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const as = (t?: string) => ({ authorization: `Bearer ${t ?? h.tokenFor(h.user)}` });
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function upload(parentType: string, parentId: string, name: string, body: Buffer, mime: string, token?: string): Promise<Res> {
  const form = new FormData();
  form.set('purpose', 'record_attachment');
  form.set('parent_type', parentType);
  form.set('parent_id', parentId);
  form.set('file', new Blob([new Uint8Array(body)], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...as(token) }, body: form });
  return { status: r.status, body: await r.json() };
}
const staged = async (parentType: string, parentId: string, name = 'bien-ban.pdf', body: Buffer = pdf({ text: name })) => {
  const r = await upload(parentType, parentId, name, body, 'application/pdf');
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  return r.body.data.file_id as string;
};
const act = async (id: string, input: unknown, token?: string, headers: Record<string, string> = {}): Promise<Res> => {
  const r = await call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(token), ...headers });
  return { status: r.status, body: await r.json() };
};
const seed = async (id: string, input: unknown) => {
  const r = await act(id, input);
  if (r.status !== 200) throw new Error(`seed ${id} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body.data.result;
};
const list = (type: 'order' | 'invoice', id: string, extra: Record<string, unknown> = {}, token?: string) => act(`${type}.files_list`, { [`${type}_id`]: id, ...extra }, token);
const attach = (type: 'order' | 'invoice', id: string, fileId: string, rev: number, token?: string) =>
  act(`${type}.file_attach`, { [`${type}_id`]: id, source: { kind: 'target_upload_handle', file_id: fileId }, if_revision: rev }, token);
const download = (fileId: string, token?: string) => fetch(`${h.base}/v1/files/${fileId}`, { headers: { 'x-workspace-id': h.ws, ...as(token) } });

beforeAll(async () => {
  execFileSync(process.execPath, [join(api, 'node_modules', 'tsup', 'dist', 'cli-default.js'), '--silent'], { cwd: api, stdio: 'ignore' });
  setValidatorEntry(join(api, 'dist', 'attachment-validator.cjs'));
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  sales = await h.member('sales');
  const lan = (await seed('contact.create', { full_name: 'Chị Lan tệp', phone: '0909322001' })).contact_id;
  const item = { name: 'Gói tệp', qty: 1, unit_price: '500000', tax_rate: 8 };
  order = (await seed('order.create', { contact_id: lan, items: [item] })).order_id;
  otherOrder = (await seed('order.create', { contact_id: lan, items: [item] })).order_id;
  invoice = (await seed('invoice.create', { order_id: order, contact_id: lan, kind: 'full', amount: '540000' })).invoice_id;
}, 240_000);
afterAll(async () => {
  setValidatorEntry(undefined);
  await resolver?.close();
  await h?.close();
});

describe('tệp đính kèm đơn — vòng đời', () => {
  it('tải lên → staging riêng tư → gắn → liệt kê → tải đúng bytes (no-store) → gỡ giữ tệp; cha không đổi tiền / version', async () => {
    const db = await tenant();
    const before = await db.order.findUniqueOrThrow({ where: { id: order }, select: { total: true, version: true, status: true } });
    const body = pdf({ text: 'Biên bản giao hàng' });
    const fid = await staged('order', order, 'Biên bản giao.pdf', body);
    expect((await db.attachmentStaging.findUniqueOrThrow({ where: { fileId: fid } })).status).toBe('pending');
    // Staging chưa gắn: chỉ người tải; link ký raw từ chối (tệp riêng tư).
    expect((await download(fid, sales.token)).status).toBe(404);
    const sig = signedFileUrl(h.base, h.app.get<Buffer>(ENC_KEY, { strict: false }), h.ws, fid);
    expect((await fetch(sig)).status).toBe(404);

    const a = await attach('order', order, fid, 0);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result).toMatchObject({ file_id: fid, version: 1, revision: 1, reused: false });
    expect(await db.attachmentStaging.findUnique({ where: { fileId: fid } })).toBeNull();
    expect(await db.fileClaim.findUniqueOrThrow({ where: { fileId: fid } })).toMatchObject({ parentType: 'order', parentId: order });
    expect(await db.outboxEvent.count({ where: { topic: 'order.file_attached' } })).toBe(1);

    const l = await list('order', order);
    expect(l.status).toBe(200);
    expect(l.body.data.result).toMatchObject({ revision: 1, can_attach: true, next_cursor: null });
    expect(l.body.data.result.files).toEqual([
      expect.objectContaining({ attachment_id: a.body.data.result.attachment_id, file_id: fid, name: 'Biên bản giao.pdf', mime: 'application/pdf', bytes: body.length, kind: 'user_attachment', version: 1, available: true, can_detach: true }),
    ]);
    expect(JSON.stringify(l.body)).not.toMatch(/storage_key|storageKey|sig=|url/);

    const d = await download(fid);
    expect(d.status).toBe(200);
    expect(d.headers.get('cache-control')).toBe('no-store');
    expect(d.headers.get('x-content-type-options')).toBe('nosniff');
    expect(createHash('sha256').update(Buffer.from(await d.arrayBuffer())).digest('hex')).toBe(createHash('sha256').update(body).digest('hex'));
    expect((await fetch(sig)).status).toBe(404);

    const g = await act('order.file_detach', { order_id: order, attachment_id: a.body.data.result.attachment_id, if_version: 1 });
    expect(g.status, JSON.stringify(g.body)).toBe(200);
    expect(g.body.data.result).toEqual({ attachment_id: a.body.data.result.attachment_id, revision: 2 });
    expect((await list('order', order)).body.data.result).toMatchObject({ files: [], revision: 2 });
    // Gỡ = đánh dấu; blob + dòng file giữ nguyên, nhưng không còn liên kết sống → không tải được qua quyền bản ghi.
    expect(await db.file.findUnique({ where: { id: fid }, select: { id: true } })).toEqual({ id: fid });
    expect((await download(fid)).status).toBe(404);
    // Gỡ lại / version cũ → 409.
    expect((await act('order.file_detach', { order_id: order, attachment_id: a.body.data.result.attachment_id, if_version: 1 })).body.error.fields).toEqual({ attachment_id: 'detached' });
    expect(await db.order.findUniqueOrThrow({ where: { id: order }, select: { total: true, version: true, status: true } })).toEqual(before);
  });

  it('gửi lại gắn cùng tệp → biên nhận cũ (reused), không tăng revision / không thêm sự kiện; revision lệch → 409', async () => {
    const db = await tenant();
    const rev = (await list('order', order)).body.data.result.revision as number;
    const fid = await staged('order', order, 'phu-luc.pdf');
    const first = await attach('order', order, fid, rev);
    expect(first.status).toBe(200);
    const events = await db.outboxEvent.count({ where: { topic: 'order.file_attached' } });
    const again = await attach('order', order, fid, rev);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(again.body.data.result).toMatchObject({ attachment_id: first.body.data.result.attachment_id, reused: true, revision: rev + 1 });
    expect(await db.outboxEvent.count({ where: { topic: 'order.file_attached' } })).toBe(events);
    const stale = await attach('order', order, await staged('order', order, 'cu.pdf'), rev);
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'STALE_VERSION', fields: { if_revision: 'changed' } });
  });

  it('một tệp một cha: staging cho đơn A gắn vào đơn B → 409 other_target; tệp đã gắn A không gắn sang B', async () => {
    const fid = await staged('order', order, 'mot-cha.pdf');
    const cross = await attach('order', otherOrder, fid, 0);
    expect(cross.status).toBe(409);
    expect(cross.body.error.fields).toEqual({ file_id: 'other_target' });
    const rev = (await list('order', order)).body.data.result.revision as number;
    expect((await attach('order', order, fid, rev)).status).toBe(200);
    expect((await attach('order', otherOrder, fid, 0)).status).toBe(422);
    // Gắn chéo domain (đề nghị) bằng tệp của đơn → không thấy staging cho đích này.
    expect((await attach('invoice', invoice, fid, 0)).status).toBe(422);
  });

  it('tệp người khác tải / tệp không phải record_attachment → 422 not_found (không lộ có tệp)', async () => {
    const mine = await staged('order', order, 'cua-toi.pdf');
    const r = await attach('order', order, mine, 0, sales.token);
    expect(r.status).toBe(404); // sales own không thấy đơn của Owner — 404 như không tồn tại
    const form = new FormData();
    form.set('purpose', 'attachment');
    form.set('file', new Blob([new Uint8Array(pdf())], { type: 'application/pdf' }), 'thuong.pdf');
    const plain = ((await (await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, ...as() }, body: form })).json()) as { data: { file_id: string } }).data.file_id;
    const rev = (await list('order', order)).body.data.result.revision as number;
    expect((await attach('order', order, plain, rev)).body.error.fields).toEqual({ file_id: 'not_found' });
  });

  it('kiểm cấu trúc trong tiến trình con: gói Office có macro qua cổng tải nhưng bị chặn khi gắn; thiếu bundle → 503, không kiểm tại chỗ', async () => {
    const db = await tenant();
    // Quan hệ ngoài nạp nội dung: cổng tải lên không xét, validator cô lập chặn.
    const ext = await upload('order', order, 'ngoai.docx', badDocx.externalRelationship(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(ext.status, JSON.stringify(ext.body)).toBe(201);
    const rev = (await list('order', order)).body.data.result.revision as number;
    const bad = await attach('order', order, ext.body.data.file_id, rev);
    expect(bad.status).toBe(422);
    expect(bad.body.error.fields).toEqual({ file_id: 'external_relationship' });
    expect(await db.attachmentStaging.findUniqueOrThrow({ where: { fileId: ext.body.data.file_id } })).toMatchObject({ status: 'rejected', reason: 'external_relationship', validatorVersion: 1 });

    const ok = await upload('order', order, 'hop-le.docx', benignDocx(['Phụ lục']), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    setValidatorEntry(null);
    try {
      const un = await attach('order', order, ok.body.data.file_id, rev);
      expect(un.status).toBe(503);
      expect(un.body.error).toMatchObject({ code: 'VALIDATION_ISOLATION_UNAVAILABLE', fields: { file_id: 'validation_unavailable' } });
    } finally {
      setValidatorEntry(join(api, 'dist', 'attachment-validator.cjs'));
    }
    // Có lại bundle → gửi lại kiểm lại cùng digest, gắn được.
    const re = await attach('order', order, ok.body.data.file_id, rev);
    expect(re.status, JSON.stringify(re.body)).toBe(200);
    expect((await list('order', order)).body.data.result.files.find((f: { file_id: string }) => f.file_id === ok.body.data.file_id)).toMatchObject({ mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  });

  it('tải lên kèm đích: thiếu / sai đích → 422; cs không có order.manage → 403; sales own đơn người khác → 404', async () => {
    const cs = await h.member('cs');
    expect((await upload('order', 'x', 'a.pdf', pdf(), 'application/pdf')).body.error.fields).toEqual({ parent: 'required' });
    expect((await upload('quote', order, 'a.pdf', pdf(), 'application/pdf')).status).toBe(422);
    expect((await upload('order', order, 'a.pdf', pdf(), 'application/pdf', cs.token)).status).toBe(403);
    expect((await upload('order', order, 'a.pdf', pdf(), 'application/pdf', sales.token)).status).toBe(404);
    expect((await upload('order', order, 'a.html', Buffer.from('<!doctype html><script>1</script>'), 'text/html')).status).toBe(415);
  });
});

describe('quyền tải tệp đã thuộc bản ghi', () => {
  it('người tải lên mất quyền đọc đơn → 404; người được giao đơn (không phải người tải) đọc được', async () => {
    const db = await tenant();
    const lan = (await seed('contact.create', { full_name: 'Chị Mai tệp', phone: '0909322002' })).contact_id;
    const o = (await seed('order.create', { contact_id: lan, items: [{ name: 'Gói giao', qty: 1, unit_price: '100000', tax_rate: 0 }] })).order_id;
    await db.order.update({ where: { id: o }, data: { assignedUserId: sales.id } });
    const up = await upload('order', o, 'cua-sales.pdf', pdf({ text: 'sales' }), 'application/pdf', sales.token);
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    expect((await attach('order', o, up.body.data.file_id, 0, sales.token)).status).toBe(200);
    expect((await download(up.body.data.file_id, sales.token)).status).toBe(200);
    expect((await download(up.body.data.file_id)).status).toBe(200); // Owner đọc qua quyền đơn
    // Bỏ giao → sales (dù là người tải) mất quyền đọc đơn → mất quyền tải tệp.
    await db.order.update({ where: { id: o }, data: { assignedUserId: null } });
    expect((await download(up.body.data.file_id, sales.token)).status).toBe(404);
    expect((await list('order', o, {}, sales.token)).status).toBe(404);
  });
});

describe('tệp đính kèm đề nghị thanh toán', () => {
  it('gắn / liệt kê / gỡ; PDF đề nghị đã sinh liệt kê chỉ đọc, không gỡ được', async () => {
    const db = await tenant();
    const gen = await staged('invoice', invoice, 'gia-lap-sinh.pdf');
    // Giả lập PDF đề nghị đã gửi: invoice.file_id trỏ tệp (đường thật ở invoice.send_payment_qr, không đổi ở TIP này).
    await db.attachmentStaging.delete({ where: { fileId: gen } });
    await db.invoice.update({ where: { id: invoice }, data: { fileId: gen } });
    const before = await db.invoice.findUniqueOrThrow({ where: { id: invoice }, select: { amount: true, status: true, version: true } });
    const fid = await staged('invoice', invoice, 'uy-nhiem-chi.pdf');
    const a = await attach('invoice', invoice, fid, 0);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    const l = (await list('invoice', invoice)).body.data.result;
    expect(l.files.map((f: { kind: string; file_id: string; can_detach: boolean; attachment_id: string | null }) => [f.kind, f.file_id, f.can_detach, f.attachment_id])).toEqual([
      ['generated_invoice', gen, false, null],
      ['user_attachment', fid, true, a.body.data.result.attachment_id],
    ]);
    expect(await db.outboxEvent.count({ where: { topic: 'invoice.file_attached' } })).toBe(1);
    expect((await act('invoice.file_detach', { invoice_id: invoice, attachment_id: a.body.data.result.attachment_id, if_version: 1 })).status).toBe(200);
    expect((await list('invoice', invoice)).body.data.result.files.map((f: { kind: string }) => f.kind)).toEqual(['generated_invoice']);
    expect(await db.invoice.findUniqueOrThrow({ where: { id: invoice }, select: { amount: true, status: true, version: true } })).toEqual(before);
  });
});

describe('đồng thời', () => {
  it('hai lượt gắn cùng revision song song → đúng một thành công, lượt kia 409', async () => {
    const lan = (await seed('contact.create', { full_name: 'Chị Hoa song song', phone: '0909322003' })).contact_id;
    const o = (await seed('order.create', { contact_id: lan, items: [{ name: 'Gói song song', qty: 1, unit_price: '100000', tax_rate: 0 }] })).order_id;
    const [f1, f2] = [await staged('order', o, 'a.pdf'), await staged('order', o, 'b.pdf')];
    const rs = await Promise.all([attach('order', o, f1, 0), attach('order', o, f2, 0)]);
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    expect((await list('order', o)).body.data.result).toMatchObject({ revision: 1 });
    expect((await list('order', o)).body.data.result.files).toHaveLength(1);
  });
});

describe('phân trang + EXPLAIN', () => {
  it('trang keyset limit / cursor ổn định; cursor hỏng → 422', async () => {
    const db = await tenant();
    const lan = (await seed('contact.create', { full_name: 'Chị Trang', phone: '0909322004' })).contact_id;
    const o = (await seed('order.create', { contact_id: lan, items: [{ name: 'Gói trang', qty: 1, unit_price: '100000', tax_rate: 0 }] })).order_id;
    const files: { id: string }[] = [];
    for (let i = 0; i < 5; i++) files.push({ id: await staged('order', o, `trang-${i}.pdf`) });
    const ids = files.map(() => uuidv7());
    // Liên kết dựng thẳng DB (trang chỉ đọc bảng liên kết + metadata tệp) — mốc thời gian khác nhau để thứ tự xác định.
    for (const [i, f] of files.entries()) await db.orderAttachment.create({ data: { id: ids[i]!, orderId: o, fileId: f.id, createdAt: new Date(Date.UTC(2026, 10, 1, 0, i)) } });
    const p1 = (await list('order', o, { limit: 2 })).body.data.result;
    expect(p1.files.map((f: { attachment_id: string }) => f.attachment_id)).toEqual([ids[4], ids[3]]);
    const p2 = (await list('order', o, { limit: 2, cursor: p1.next_cursor })).body.data.result;
    expect(p2.files.map((f: { attachment_id: string }) => f.attachment_id)).toEqual([ids[2], ids[1]]);
    const p3 = (await list('order', o, { limit: 2, cursor: p2.next_cursor })).body.data.result;
    expect(p3).toMatchObject({ next_cursor: null });
    expect(p3.files.map((f: { attachment_id: string }) => f.attachment_id)).toEqual([ids[0]]);
    expect((await list('order', o, { cursor: 'hong' })).body.error.fields).toEqual({ cursor: 'invalid' });
  });

  it('EXPLAIN 100k: trang theo cha dùng index một phần *_attachment_list_idx, không Seq Scan / Sort', async () => {
    // Kết nối migrator (chủ bảng — ANALYZE cần quyền chủ, user app bị bỏ qua) như assistant-agent-choices.test.
    const c = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await c.connect();
    const plan = async (sql: string, args: unknown[]) => (await c.query(`EXPLAIN ${sql}`, args)).rows.map((x) => x['QUERY PLAN']).join('\n');
    try {
      // 100k liên kết (cha phải là đơn thật — FK): 1% cho đơn cần đo, 99% dồn vào đơn khác — tập theo cha thưa so với bảng.
      await c.query(`INSERT INTO order_attachment (id, order_id, file_id, created_at, detached_at)
        SELECT gen_random_uuid(), (CASE WHEN g % 100 = 0 THEN $1 ELSE $2 END)::uuid, gen_random_uuid(), now() - (g || ' seconds')::interval,
               CASE WHEN g % 10 = 0 THEN now() END
          FROM generate_series(1, 100000) g`, [order, otherOrder]);
      await c.query(`INSERT INTO invoice_attachment (id, invoice_id, file_id, created_at)
        SELECT gen_random_uuid(), $1::uuid, gen_random_uuid(), now() - (g || ' seconds')::interval FROM generate_series(1, 100000) g`, [invoice]);
      await c.query('ANALYZE order_attachment');
      await c.query('ANALYZE invoice_attachment');
      const page = 'SELECT id, file_id, version, created_by, created_at FROM order_attachment WHERE order_id = $1::uuid AND detached_at IS NULL';
      const o = await plan(`${page} ORDER BY created_at DESC, id DESC LIMIT 21`, [order]);
      expect(o).toMatch(/order_attachment_list_idx/);
      expect(o).not.toMatch(/Seq Scan|Sort/);
      const after = await plan(`${page} AND (created_at, id) < ($2::timestamptz, $3::uuid) ORDER BY created_at DESC, id DESC LIMIT 21`, [order, new Date(), order]);
      expect(after).toMatch(/order_attachment_list_idx/);
      expect(after).not.toMatch(/Seq Scan|Sort/);
      const i = await plan('SELECT id, file_id, version, created_by, created_at FROM invoice_attachment WHERE invoice_id = $1::uuid AND detached_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 21', [invoice]);
      expect(i).toMatch(/invoice_attachment_list_idx/);
      expect(i).not.toMatch(/Seq Scan|Sort/);
      const holds = await plan('SELECT id FROM order_attachment WHERE file_id = $1::uuid AND detached_at IS NULL LIMIT 1', [order]);
      expect(holds).toMatch(/order_attachment_file_idx/);
    } finally {
      await c.query(`DELETE FROM order_attachment WHERE created_by IS NULL`);
      await c.query(`DELETE FROM invoice_attachment WHERE created_by IS NULL`);
      await c.end();
    }
  }, 120_000);
});
