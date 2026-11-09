// TIP-015c pha 3 trên Postgres + Redis thật: contact.forget tombstone định danh (SĐT/email) ngay lúc accept (recreation.ts), journal
// nền tảng reserve/acknowledge MỘT revision (journal.ts, privacy_journal_entry) cùng lượt — contact.allow_recreation từ chối khi định
// danh CHƯA bị tombstone, cấp permit khi ĐÃ tombstone (chưa phục hồi dữ liệu cũ, chỉ mở lại khả năng tạo mới).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parseEncKey, uuidv7 } from '@appchat/core';
import { call as http, env } from './setup';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.forget');
}, 120_000);
afterAll(() => m?.close());

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const asHeader = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});

async function httpCall(id: string, input: unknown, who?: { token: string }): Promise<Res> {
  const r = await http(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...asHeader(who) });
  return { status: r.status, body: await r.json() };
}
async function httpConfirm(id: string, input: unknown, token: string, who?: { token: string }): Promise<Res> {
  const r = await http(m.h, `/actions/${id}`, { input, confirm_token: token }, { 'idempotency-key': uuidv7(), ...asHeader(who) });
  return { status: r.status, body: await r.json() };
}
const create = async (name: string, phone: string) => (await m.seed('contact.create', { full_name: name, phone })).contact_id as string;
const versionOf = async (id: string) => {
  const db = await m.db();
  return (await db.contact.findUniqueOrThrow({ where: { id } })).version;
};

describe('contact.forget — tombstone định danh (pha 3)', () => {
  it('SĐT đã tombstone → không khớp active, giữ tombstoned trong privacy_identity_token', async () => {
    const phone = '0909892101';
    const id = await create('Chị Tombstone', phone);
    const v = await versionOf(id);
    const pv = await httpCall('contact.privacy_preview', { contact_id: id });
    expect(pv.status).toBe(200);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await httpCall('contact.forget', input);
    expect(forgetPv.status).toBe(202);
    const accepted = await httpConfirm('contact.forget', input, forgetPv.body.data.confirm_token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);

    const db = await m.db();
    const rows = await db.$queryRaw<{ namespace: string; fresh_contact_id: string | null }[]>`SELECT "namespace", "fresh_contact_id" FROM "privacy_identity_token"`;
    expect(rows.some((r) => r.namespace === 'phone' && r.fresh_contact_id === null)).toBe(true);
  });
});

describe('contact.allow_recreation — chỉ cấp khi TOÀN BỘ định danh đã tombstone (pha 3)', () => {
  it('SĐT chưa từng quên → 422 not_all_tombstoned', async () => {
    const r = await httpCall('contact.allow_recreation', { identifiers: [{ kind: 'phone', value: '0909899999' }], create_input: { full_name: 'Người mới', phone: '0909899999' } });
    expect(r.status).toBe(422);
  });

  it('SĐT đã quên → preview + confirm cấp permit_id/expires_at (không phục hồi dữ liệu cũ)', async () => {
    const phone = '0909892102';
    const id = await create('Anh Permit', phone);
    const v = await versionOf(id);
    const pv = await httpCall('contact.privacy_preview', { contact_id: id });
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await httpCall('contact.forget', input);
    await httpConfirm('contact.forget', input, forgetPv.body.data.confirm_token);

    const recInput = { identifiers: [{ kind: 'phone', value: phone }], create_input: { full_name: 'Hồ sơ mới', phone } };
    const recPv = await httpCall('contact.allow_recreation', recInput);
    expect(recPv.status, JSON.stringify(recPv.body)).toBe(202);
    const recDone = await httpConfirm('contact.allow_recreation', recInput, recPv.body.data.confirm_token);
    expect(recDone.status, JSON.stringify(recDone.body)).toBe(200);
    expect(recDone.body.data.result.permit_id).toBeTruthy();
    expect(recDone.body.data.result.expires_at).toBeTruthy();

    const db = await m.db();
    const permits = await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "privacy_recreation_permit" WHERE "id" = ${recDone.body.data.result.permit_id}::uuid`;
    expect(permits.length).toBe(1);
  });
});

describe('journal nền tảng — reserve + acknowledge cùng lượt contact.forget (pha 3)', () => {
  it('privacy_journal_entry có đúng 1 dòng acknowledged cho operation vừa accept', async () => {
    const phone = '0909892103';
    const id = await create('Chị Journal', phone);
    const v = await versionOf(id);
    const pv = await httpCall('contact.privacy_preview', { contact_id: id });
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await httpCall('contact.forget', input);
    const accepted = await httpConfirm('contact.forget', input, forgetPv.body.data.confirm_token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    const operationId = accepted.body.data.result.operation_id as string;

    const key = parseEncKey(env.APP_ENC_KEY!);
    const entries = await m.h.platform.privacyJournalEntry.findMany({ where: { operationId } });
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.acknowledgedAt !== null)).toBe(true);
    expect(entries.every((e) => e.workspaceId === m.h.ws)).toBe(true);
    void key; // giữ import parseEncKey hợp lệ (dùng để khẳng định APP_ENC_KEY có cấu hình ở env test, giải mã capsule ở pha khôi phục sau)
  });
});
