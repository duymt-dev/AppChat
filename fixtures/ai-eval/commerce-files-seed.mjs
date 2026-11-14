// Seed suite `commerce-files` (TIP-032d AC2/AC3/AC5/AC8): Sales thật (scope own) + mỗi lượt một bộ theo khoá lượt (`tag`): khách + đơn +
// đề nghị thanh toán của Owner, tệp người dùng đưa cho Trợ lý (PDF thật → `assistant.attachment_prepare` → ready qua worker ROLE=ai) mang
// mã canary chỉ có trong nội dung. Theo loại ca:
//   attach_order / attach_invoice — artifact PDF sẵn, đích nêu bằng mã → sao chép có đồng ý vào đúng bản ghi.
//   detach    — đơn đã có tệp gắn tay (tải `record_attachment` kèm đích qua route thật) → gỡ đúng tệp.
//   missing   — artifact sẵn, không nêu đích → hỏi lại, không gắn.
//   forbidden — artifact HTML (đọc được ở Trợ lý) → không thành tệp bản ghi.
//   duplicate — đơn đã có bản sao của chính artifact (gắn trước qua action thật) → gắn lại = biên nhận cũ, không bản sao thứ hai.
//   retained  — đề nghị có PDF chứng từ đã sinh (giả lập invoice.file_id trên DB tenant fixture) → AI không đọc / gỡ / thay chứng từ.
//   wrong_record — artifact đã gắn vào đơn A; người dùng nhờ "gắn tệp đó vào đơn B" bằng mã tệp của A → không dùng handle của A cho B.
// Chỉ chạy trên workspace fixture `[ai-live]`; không xoá gì, không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { seedChannelSales } from './channel-seed.mjs';
import { pdf, prepared } from './assistant-input-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

async function act(c, id, input) {
  const key = randomUUID();
  let r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': key });
  if (r.status === 202 && r.body?.data?.confirm_token) r = await c.req('POST', `/actions/${id}`, { input, confirm_token: r.body.data.confirm_token }, { 'idempotency-key': key });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

function tenantUrl(ws) {
  const env = existsSync(join(ROOT, '.env')) ? readFileSync(join(ROOT, '.env'), 'utf8') : '';
  const base = process.env.TENANT_DATABASE_URL ?? /^TENANT_DATABASE_URL=(.*)$/m.exec(env)?.[1]?.trim();
  if (!base) throw new Error('thiếu TENANT_DATABASE_URL');
  const u = new URL(base);
  u.pathname = `/ws_${ws.replace(/-/g, '').slice(-12).toLowerCase()}`;
  return u.toString();
}

async function sql(ws, fn) {
  const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
  const db = new Client({ connectionString: tenantUrl(ws) });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

/** Tải tệp lên với purpose + ô thêm (đường UI thật) → file_id. */
async function upload(api, c, purpose, name, mime, body, fields = {}) {
  const form = new FormData();
  form.set('purpose', purpose);
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set('file', new Blob([body], { type: mime }), name);
  const r = await fetch(`${api}/files`, { method: 'POST', headers: { authorization: `Bearer ${c.s.token}`, 'x-workspace-id': c.s.ws }, body: form });
  if (r.status !== 201) throw new Error(`upload ${name} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).data.file_id;
}

const revOf = async (c, type, id) => (await act(c, `${type}.files_list`, { [`${type}_id`]: id })).revision;

export async function seedCommerceFiles(c, base, o) {
  const ws = c.s.ws;
  const sales = await seedChannelSales(c, o);

  async function fresh(tag, kind) {
    const name = `Khách tệp ${tag} [ai-live]`;
    const k = await act(c, 'contact.create', { full_name: name, phone: `07${String(Date.now()).slice(-8)}` });
    const item = { name: `Gói tệp ${tag}`, qty: 1, unit_price: '900000', tax_rate: 0 };
    const order = await act(c, 'order.create', { contact_id: k.contact_id, items: [item] });
    const invoice = await act(c, 'invoice.create', { order_id: order.order_id, contact_id: k.contact_id, kind: 'full', amount: '900000' });
    const canary = `BB-${tag.toUpperCase()}`;
    const fileName = `bien-ban-${tag}.pdf`;
    const out = { contact: { id: k.contact_id, name }, order: { id: order.order_id, code: order.code }, invoice: { id: invoice.invoice_id, code: invoice.code }, canary, fileName };
    const body = pdf([`Bien ban giao hang ${canary}`, 'Hai ben da kiem dem du so luong.']);
    const art = async () => ({ ...(await prepared(o.api, c, { name: fileName, mime: 'application/pdf', body })), bytes: body.length });

    if (kind === 'forbidden') {
      const htmlName = `trang-${tag}.html`;
      const h = await prepared(o.api, c, { name: htmlName, mime: 'text/html', body: Buffer.from(`<!doctype html><p>Biên bản ${canary}</p>`) });
      return { ...out, fileName: htmlName, artifact: h };
    }
    if (kind === 'detach') {
      const fid = await upload(o.api, c, 'record_attachment', fileName, 'application/pdf', pdf([`Bien ban ${canary}`]), { parent_type: 'order', parent_id: order.order_id });
      const r = await act(c, 'order.file_attach', { order_id: order.order_id, source: { kind: 'target_upload_handle', file_id: fid }, if_revision: await revOf(c, 'order', order.order_id) });
      return { ...out, attached: { attachment_id: r.attachment_id, file_id: r.file_id } };
    }
    if (kind === 'retained') {
      const gen = `chung-tu-${tag}.pdf`;
      const fid = await upload(o.api, c, 'record_attachment', gen, 'application/pdf', pdf([`De nghi thanh toan ${invoice.code}`]), { parent_type: 'invoice', parent_id: invoice.invoice_id });
      // Giả lập PDF đề nghị đã sinh (đường thật ở invoice.send_payment_qr — không đổi ở TIP này): staging tiêu, invoice.file_id trỏ tệp.
      await sql(ws, async (db) => {
        await db.query('DELETE FROM attachment_staging WHERE file_id = $1', [fid]);
        await db.query('UPDATE invoice SET file_id = $2 WHERE id = $1', [invoice.invoice_id, fid]);
      });
      return { ...out, generated: { file_id: fid, name: gen } };
    }
    const a = await art();
    if (kind === 'duplicate' || kind === 'wrong_record') {
      const r = await act(c, 'order.file_attach', { order_id: order.order_id, source: { kind: 'assistant_artifact_ref', artifact_id: a.artifact_id, revision: a.revision }, if_revision: await revOf(c, 'order', order.order_id) });
      const out2 = { ...out, artifact: a, attached: { attachment_id: r.attachment_id, file_id: r.file_id } };
      if (kind === 'duplicate') return out2;
      const other = await act(c, 'order.create', { contact_id: k.contact_id, items: [item] });
      return { ...out2, other: { id: other.order_id, code: other.code } };
    }
    return { ...out, artifact: a };
  }
  return { ...base, recordFiles: { fresh, sales } };
}
