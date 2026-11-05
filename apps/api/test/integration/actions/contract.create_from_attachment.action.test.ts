// Ma trận contract.create_from_attachment (TIP-030b spec 3, AC2): tệp khách gửi trong hội thoại → hợp đồng nháp nguồn tệp, khách = khách
// của hội thoại. 403 cs (không contract.draft) · sales không thấy hội thoại → 403 SCOPE_FORBIDDEN trước khi đọc bytes · tin lạ → 404 ·
// chỉ số vượt / tệp CDN ngoài → 422 · khách khác → cảnh báo lệch trong preview · preview → xác nhận → undo · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContractDeps, signedFileUrl, uuidv7 } from '@appchat/core';
import { pdf } from '../../../../../fixtures/contracts/files/build-fixtures';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let vy: string;
let msg: string;

async function upload(name: string, body: Buffer) {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([new Uint8Array(body)], { type: 'application/pdf' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.tokenFor(m.h.user)}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  m = await matrix('contract.create_from_attachment');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Zalo', phone: '0909480201' })).contact_id;
  vy = (await m.seed('contact.create', { full_name: 'Chị Vy', phone: '0909480202' })).contact_id;
  const conv = await m.conv({ contactId: lan, channel: 'zalo_personal', title: 'Lan' });
  const deps = m.h.app.get(ContractDeps, { strict: false });
  const fid = await upload('hop-dong-lan.pdf', pdf({ text: 'HOP DONG - Ben B: Lan' }));
  msg = uuidv7();
  const db = await m.db();
  await db.message.create({
    data: { id: msg, conversationId: conv.id, channelAccountId: conv.account, direction: 'in', senderType: 'contact', kind: 'file', body: '', attachments: [{ url: signedFileUrl(deps.env!.apiBase, deps.env!.key, m.h.ws, fid), mime: 'application/pdf', name: 'hop-dong-lan.pdf' }, { url: 'https://cdn.example/x.pdf', mime: 'application/pdf' }], externalMsgId: uuidv7(), status: 'delivered', createdAt: m.h.clock.now() },
  });
}, 120_000);
afterAll(() => m?.close());

describe('contract.create_from_attachment', () => {
  it('403 cs · sales ngoài scope hội thoại → 403 · tin lạ → 404 · chỉ số vượt / CDN ngoài → 422', async () => {
    expect((await m.act({ message_id: msg, attachment_idx: 0 }, m.cs)).status).toBe(403);
    expect((await m.act({ message_id: msg, attachment_idx: 0 }, m.sales)).body.error).toMatchObject({ code: 'SCOPE_FORBIDDEN' });
    expect((await m.act({ message_id: uuidv7(), attachment_idx: 0 })).status).toBe(404);
    expect((await m.act({ message_id: msg, attachment_idx: 7 })).body.error.fields).toEqual({ attachment_idx: 'out_of_range' });
    expect((await m.act({ message_id: msg, attachment_idx: 1 })).body.error.fields).toEqual({ attachment: 'not_stored' });
    expect(await (await m.db()).contract.count()).toBe(0);
  });

  it('preview Trợ lý (đúng khách hội thoại) → xác nhận → undo xoá mềm', async () => {
    const { preview, done } = await m.confirm({ message_id: msg, attachment_idx: 0, value: '4000000' });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'contract', after: { contact: 'Chị Lan Zalo', owner: 'Chủ Spa', kind: 'service', value: '4000000', file: 'hop-dong-lan.pdf' } }] });
    expect(preview.warnings).toBeUndefined();
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const id = done.body.data.result.contract_id;
    expect(await (await m.db()).contract.findUniqueOrThrow({ where: { id } })).toMatchObject({ contactId: lan, source: 'file', originMessageId: msg, originAttachmentIdx: 0 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contract.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  });

  it('khách chỉ định khác khách hội thoại → cảnh báo lệch hiện trên thẻ, không tự gộp', async () => {
    const { preview } = await m.confirm({ message_id: msg, attachment_idx: 0, contact_id: vy });
    expect(preview.warnings).toEqual(['contact_mismatch']);
    expect(preview.changes[0].after.contact).toBe('Chị Vy');
  });

  it('idempotency', async () => {
    const inp = { message_id: msg, attachment_idx: 0 };
    const a = await m.actWithKey('hd-att-idem', inp);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect((await m.actWithKey('hd-att-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
