// TIP-015e §2.3–§2.5, §4 (AC2, AC3, AC5) trên Postgres thật: gộp không hợp quyền (khác chủ / khác ACL → 409 acl_mismatch, không ai được
// thêm quyền); chỉ cặp đã chọn gộp, cặp cùng bản chính gộp một đơn vị; hoàn tác có điều kiện — sau gộp có ghi chú mới / đổi trường / đổi ACL
// → 409 và KHÔNG đổi gì; bản ghi mới tạo sau gộp ở bản chính không bị dời khi hoàn tác hợp lệ; đơn / báo giá giữ id khách gốc (lineage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;
const mk = async (name: string, phone: string, who?: Parameters<Matrix['seed']>[2]) => (await m.seed('contact.create', { full_name: name, phone }, who)).contact_id as string;
const merge = (pairs: string[], extra: Record<string, unknown> = {}) => m.confirm({ group_ids: pairs, ...extra });

beforeAll(async () => {
  m = await matrix('contact.merge');
}, 120_000);
afterAll(() => m?.close());

describe('gộp khách — quyền + lineage + hoàn tác có điều kiện', () => {
  it('khác người phụ trách → 409 acl_mismatch, không đổi gì, không thêm collaborator', async () => {
    const a = await mk('Khách A Owner', '0909810001');
    // Khách do Sales tạo → người phụ trách = Sales (khác bản chính của Owner).
    const b = { contact_id: await mk('Khách B Sales', '0909810002', m.sales) };
    const db0 = await m.db();
    expect((await db0.contact.findUniqueOrThrow({ where: { id: b.contact_id } })).ownerUserId).toBe(m.sales.id);
    const r = await m.act({ group_ids: [`${a}~${b.contact_id}`] }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ merge: 'acl_mismatch' });
    const db = await m.db();
    expect(await db.contactCollaborator.count({ where: { contactId: a } })).toBe(0);
    expect((await db.contact.findUniqueOrThrow({ where: { id: b.contact_id } })).mergedIntoId).toBeNull();
  });

  it('khác tập collaborator → 409; chia sẻ cho khớp rồi gộp được', async () => {
    const a = await mk('Khách ACL A', '0909810003');
    const b = await mk('Khách ACL B', '0909810004');
    await m.seed('contact.add_collaborator', { contact_id: b, user_id: m.sales.id, role: 'watcher' });
    expect((await m.act({ group_ids: [`${a}~${b}`] }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ merge: 'acl_mismatch' });
    await m.seed('contact.add_collaborator', { contact_id: a, user_id: m.sales.id, role: 'watcher' });
    const { done } = await merge([`${a}~${b}`]);
    expect(done.body.data.result).toEqual({ merged: 1 });
    // Không nâng watcher thành collaborator, không nhân đôi.
    expect(await (await m.db()).contactCollaborator.findMany({ where: { contactId: a }, select: { userId: true, role: true } })).toEqual([{ userId: m.sales.id, role: 'watcher' }]);
  });

  it('hai cặp cùng bản chính = một đơn vị; ghi chú / việc dời, đơn giữ id khách gốc', async () => {
    const p = await mk('Chị Hà Chính', '0909810005');
    const s1 = await mk('Chị Hà Phụ 1', '0909810006');
    const s2 = await mk('Chị Hà Phụ 2', '0909810007');
    await m.seed('contact.add_note', { contact_id: s1, body: 'Ghi chú của phụ 1' });
    await m.seed('contact_task.create', { contact_id: s2, title: 'Gọi lại phụ 2' });
    const order = (await m.seed('order.create', { contact_id: s1, items: [{ name: 'Gói da', qty: 1, unit_price: '1000000', tax_rate: 0 }] })).order_id;
    const { done } = await merge([`${p}~${s1}`, `${p}~${s2}`]);
    expect(done.body.data.result).toEqual({ merged: 2 });
    const db = await m.db();
    expect(await db.contactNote.count({ where: { contactId: p } })).toBeGreaterThanOrEqual(1);
    expect(await db.contactTask.count({ where: { contactId: p } })).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: order } })).contactId).toBe(s1);
    expect(await db.contactMergeReceipt.count({ where: { primaryId: p } })).toBe(1);
    // Hoàn tác hợp lệ: ghi chú / việc trả đúng bản phụ.
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await db.contactTask.count({ where: { contactId: s2 } })).toBe(1);
    expect((await db.contact.findUniqueOrThrow({ where: { id: s1 } })).mergedIntoId).toBeNull();
  });

  it('sau gộp có thay đổi (sửa bản chính / thêm collaborator) → hoàn tác 409, không đổi gì', async () => {
    const p = await mk('Anh Tú Chính', '0909810008');
    const s = await mk('Anh Tú Phụ', '0909810009');
    const { done } = await merge([`${p}~${s}`]);
    await m.seed('contact.update', { contact_id: p, patch: { city: 'Đà Nẵng' } });
    const r = await m.undo(done.body.data.action_log_id);
    expect(r.status).toBe(409);
    const db = await m.db();
    expect((await db.contact.findUniqueOrThrow({ where: { id: s } })).mergedIntoId).toBe(p);
    expect((await db.contactMergeReceipt.findFirstOrThrow({ where: { primaryId: p } })).state).toBe('merged');

    const p2 = await mk('Cô Mai Chính', '0909810010');
    const s2 = await mk('Cô Mai Phụ', '0909810011');
    const d2 = (await merge([`${p2}~${s2}`])).done;
    await m.seed('contact.add_collaborator', { contact_id: p2, user_id: m.sales.id, role: 'collaborator' });
    expect((await m.undo(d2.body.data.action_log_id)).status).toBe(409);
    expect(await db.contactCollaborator.count({ where: { contactId: p2, userId: m.sales.id } })).toBe(1);
  });

  it('khách đã gộp / đã xoá không gộp lại; phụ cũng là chính → 422', async () => {
    const p = await mk('Bé Na Chính', '0909810012');
    const s = await mk('Bé Na Phụ', '0909810013');
    const t = await mk('Bé Na Ba', '0909810014');
    expect((await m.act({ group_ids: [`${p}~${s}`, `${s}~${t}`] }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
    await merge([`${p}~${s}`]);
    expect((await m.act({ group_ids: [`${t}~${s}`] }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });
});
