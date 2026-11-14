// TIP-015e §4.2–§4.4 (AC2, AC5) trên Postgres thật: rào đồng thời của gộp khách — hai lần gộp tranh cùng bản phụ (một thắng, một 404 / 409,
// không gộp đôi); gộp ↔ sửa khách (phiên bản đổi sau xem trước → 409); job dọn biên nhận ↔ hoàn tác (dọn bỏ qua biên nhận đang khoá);
// quá 7 ngày → dọn payload riêng tư (giữ dòng tối thiểu, dữ liệu kinh doanh nguyên), hoàn tác 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MERGE_UNDO_MS, purgeMergeReceiptPayloads, uuidv7 } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';
import { call } from './setup';

let m: Matrix;
const src = { 'x-action-source': 'assistant' };
const mk = async (name: string, phone: string) => (await m.seed('contact.create', { full_name: name, phone })).contact_id as string;
const token = async (pairs: string[]) => {
  const r = await m.act({ group_ids: pairs }, undefined, src);
  expect(r.status, JSON.stringify(r.body)).toBe(202);
  return r.body.data.confirm_token as string;
};
const exec = (pairs: string[], confirm: string) =>
  call(m.h, `/actions/contact.merge`, { input: { group_ids: pairs }, confirm_token: confirm }, { 'idempotency-key': uuidv7(), ...src }).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any

beforeAll(async () => {
  m = await matrix('contact.merge');
}, 120_000);
afterAll(() => m?.close());

describe('gộp khách — rào đồng thời + dọn biên nhận', () => {
  it('hai lần gộp cùng bản phụ song song → đúng một thắng, bản phụ chỉ gộp một lần', async () => {
    const p1 = await mk('Chú Bình A', '0909820001');
    const p2 = await mk('Chú Bình B', '0909820002');
    const s = await mk('Chú Bình Phụ', '0909820003');
    const [t1, t2] = [await token([`${p1}~${s}`]), await token([`${p2}~${s}`])];
    const rs = await Promise.all([exec([`${p1}~${s}`], t1), exec([`${p2}~${s}`], t2)]);
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect([404, 409]).toContain(rs.find((r) => r.status !== 200)!.status);
    const db = await m.db();
    expect(await db.contactMergeReceipt.count({ where: { sourceIds: { has: s } } })).toBe(1);
  });

  it('sửa bản phụ sau xem trước (phiên bản đã xem) → 409 STALE_VERSION, không gộp', async () => {
    const p = await mk('Cô Thu Chính', '0909820004');
    const s = await mk('Cô Thu Phụ', '0909820005');
    const db = await m.db();
    const vs = Object.fromEntries((await db.contact.findMany({ where: { id: { in: [p, s] } }, select: { id: true, version: true } })).map((c) => [c.id, c.version]));
    await m.seed('contact.update', { contact_id: s, patch: { city: 'Huế' } });
    const r = await m.act({ group_ids: [`${p}~${s}`], expected_versions: vs }, undefined, src);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('STALE_VERSION');
    expect((await db.contact.findUniqueOrThrow({ where: { id: s } })).mergedIntoId).toBeNull();
  });

  it('dọn ↔ hoàn tác: biên nhận đang khoá bị bỏ qua; hết 7 ngày → dọn payload, hoàn tác 409, ghi chú vẫn ở bản chính', async () => {
    const p = await mk('Anh Khoa Chính', '0909820006');
    const s = await mk('Anh Khoa Phụ', '0909820007');
    await m.seed('contact.add_note', { contact_id: s, body: 'Ghi chú cần giữ' });
    const { done } = await m.confirm({ group_ids: [`${p}~${s}`] });
    expect(done.status).toBe(200);
    const db = await m.db();
    const rc = await db.contactMergeReceipt.findFirstOrThrow({ where: { primaryId: p } });
    const later = new Date(rc.expiresAt.getTime() + 1);

    // Một giao dịch khác giữ khoá biên nhận (như hoàn tác đang chạy) → job dọn SKIP LOCKED, không đụng.
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    let locked!: () => void;
    const isLocked = new Promise<void>((r) => (locked = r));
    const holder = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM contact_merge_receipt WHERE id = ${rc.id}::uuid FOR UPDATE`;
      locked();
      await held;
    }, { timeout: 30_000 });
    await isLocked;
    // Biên nhận của test trước (hết hạn sớm hơn) có thể bị dọn — chỉ kiểm biên nhận đang khoá.
    await purgeMergeReceiptPayloads(db, later);
    expect((await db.contactMergeReceipt.findUniqueOrThrow({ where: { id: rc.id } })).state).toBe('merged');
    release();
    await holder;

    await purgeMergeReceiptPayloads(db, new Date(rc.expiresAt.getTime() - 1));
    expect((await db.contactMergeReceipt.findUniqueOrThrow({ where: { id: rc.id } })).state).toBe('merged');
    expect(await purgeMergeReceiptPayloads(db, later)).toBe(1);
    expect(await purgeMergeReceiptPayloads(db, later)).toBe(0);
    const after = await db.contactMergeReceipt.findUniqueOrThrow({ where: { id: rc.id }, include: { items: true } });
    expect(after).toMatchObject({ state: 'expired', items: [], fill: {}, aclFingerprint: '' });
    expect(await db.contactNote.count({ where: { contactId: p } })).toBeGreaterThanOrEqual(1);

    m.h.clock.advance(MERGE_UNDO_MS + 1000);
    const u = await m.undo(done.body.data.action_log_id);
    expect(u.status).toBeGreaterThanOrEqual(400);
    expect((await db.contact.findUniqueOrThrow({ where: { id: s } })).mergedIntoId).toBe(p);
  });
});
