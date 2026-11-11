// TIP-015g AC5 trên Postgres 16 native: hoàn tác đổi giai đoạn tay chỉ khi khách vẫn đúng bản sau-ghi — sau đổi tay / tự động / ABA /
// gộp / xoá / "Quên khách" / mất quyền ghi → 409, không đè. Hoàn tác sạch khôi phục ĐÚNG trường đã chạm (mốc kéo tay cũ với micro giây,
// lần tương tác), giữ trường khác, version mới (không trả version cũ). Biên nhận cũ thiếu vân tay → 409.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { applyStageRule, lockStageFamily, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 't'));
}, 60_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> => (u ? { authorization: `Bearer ${u.token}` } : {});
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(who) }).then(json);
const undo = (logId: string, who?: { token: string }) => call(h, `/action-logs/${logId}/undo`, {}, as(who)).then(json);
const MICRO = '2026-10-29T03:04:05.123456Z';

let n = 0;
/** Khách có mốc kéo tay cũ (micro giây) đã hết giữ; trả id + log của lần đổi tay sang `to`. */
async function moved(to = 'quote', who?: { token: string }) {
  const c = await act('contact.create', { full_name: `Khách hoàn tác ${++n}`, phone: `09095300${String(n).padStart(2, '0')}` }, who);
  expect(c.status, JSON.stringify(c.body)).toBe(200);
  const id = c.body.data.result.contact_id as string;
  await db.$executeRaw`UPDATE contact SET stage = 'consulting', stage_set_manually_at = ${MICRO}::timestamptz WHERE id = ${id}::uuid`;
  const r = await act('contact.set_stage', { contact_id: id, stage: to }, who);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return { id, log: r.body.data.action_log_id as string };
}
const manualText = async (id: string) =>
  (await db.$queryRaw<{ t: string | null }[]>`SELECT to_char(stage_set_manually_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS t FROM contact WHERE id = ${id}::uuid`)[0]!.t;

describe('hoàn tác sạch (AC5)', () => {
  it('khôi phục giai đoạn + mốc kéo tay micro giây + lần tương tác, giữ trường khác, version tăng tiếp; lịch sử chỉ ghi thêm', async () => {
    const { id, log } = await moved();
    const before = await db.contact.findUniqueOrThrow({ where: { id } });
    const tl = await db.timelineEvent.count({ where: { contactId: id } });
    expect((await undo(log)).status).toBe(200);
    const after = await db.contact.findUniqueOrThrow({ where: { id } });
    expect(after.stage).toBe('consulting');
    expect(await manualText(id)).toBe('2026-10-29T03:04:05.123456Z');
    expect(after.version).toBe(before.version + 1);
    expect(after.name).toBe(before.name);
    expect(await db.timelineEvent.count({ where: { contactId: id } })).toBe(tl + 1);
  });
});

describe('hoàn tác bị chặn (AC5)', () => {
  it('sau đổi tay khác / tự động / ABA → 409, không đè', async () => {
    const a = await moved();
    expect((await act('contact.set_stage', { contact_id: a.id, stage: 'contract' })).status).toBe(200);
    expect((await undo(a.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: a.id } })).stage).toBe('contract');

    const b = await moved('potential');
    h.clock.advance(86_400_000);
    await db.$transaction(async (tx) => {
      await lockStageFamily(tx, b.id);
      expect(await applyStageRule(tx, { contactId: b.id, mode: 'raise', to: 'quote', actor: { type: 'system', id: null }, now: h.clock.now() })).toHaveLength(1);
    });
    expect((await undo(b.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: b.id } })).stage).toBe('quote');

    const c = await moved();
    expect((await act('contact.set_stage', { contact_id: c.id, stage: 'lead' })).status).toBe(200);
    expect((await act('contact.set_stage', { contact_id: c.id, stage: 'quote' })).status).toBe(200);
    expect((await undo(c.log)).status).toBe(409);
  });

  it('sau gộp vào khách khác / xoá / "Quên khách" → 409; không hồi sinh, không đi theo bí danh', async () => {
    const other = await moved();
    const a = await moved();
    await db.$executeRaw`UPDATE contact SET merged_into_id = ${other.id}::uuid, deleted_at = ${h.clock.now()} WHERE id = ${a.id}::uuid`;
    expect((await undo(a.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: other.id } })).stage).toBe('quote');

    const b = await moved();
    await db.contact.update({ where: { id: b.id }, data: { deletedAt: h.clock.now() } });
    expect((await undo(b.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: b.id } })).deletedAt).not.toBeNull();

    const c = await moved();
    const op = uuidv7();
    await db.privacyOperation.create({ data: { id: op, canonicalContactId: c.id, familyGeneration: 1, requesterId: h.user, policyVersion: 1, inventoryRevision: 'x', requestKey: `t-${op}` } });
    await db.privacyFamilyMember.create({ data: { operationId: op, contactId: c.id } });
    expect((await undo(c.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe('quote');
  });

  it('người làm mất quyền ghi khách → bị chặn (404 theo scope, không lộ)', async () => {
    sales = await h.member('sales'); // token theo đồng hồ hiện tại (test trước đã tua đồng hồ)
    const a = await moved('quote', sales);
    await db.contact.update({ where: { id: a.id }, data: { ownerUserId: h.user } });
    expect((await undo(a.log, sales)).status).toBe(404);
  });

  it('biên nhận cũ thiếu vân tay → 409, không khôi phục vô điều kiện', async () => {
    const a = await moved();
    await db.actionLog.update({ where: { id: a.log }, data: { before: { id: a.id, stage: 'consulting', at: null }, after: { id: a.id, stage: 'quote', version: 9 } } });
    expect((await undo(a.log)).status).toBe(409);
    expect((await db.contact.findUniqueOrThrow({ where: { id: a.id } })).stage).toBe('quote');
  });
});
