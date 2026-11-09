// TIP-019c lát 2 (HTTP thật + model giả + Postgres): `utility_operation` là fence công bố — GET /v1/ai-utilities/:runId/result chỉ trả
// `validated_result` (không chữ thô), quyền như đọc run (người khởi tạo / Chủ; người khác = id lạ = run không phải tiện ích → 404 như
// nhau); gọi lại cùng Idempotency-Key không tạo run / operation thứ hai; khôi phục sau sự cố không gọi lại model: chưa có chữ thô →
// `unknown`, chữ thô + nguồn còn → `validated`, nguồn đã thu hồi → `invalidated`, chữ dán không lưu → `failed`.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RunStore, makeRevalidate, recoverUtilities, utilityValidatorOf, uuidv7, UTILITY_RECOVERY_GRACE_MS } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantDbResolver } from '@appchat/db';
import { call, env } from './setup';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;
let conv: { id: string; message: string };
let resolver: TenantDbResolver;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = async (path: string, who?: { token: string }) => call(m.h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {}).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));
const summarize = (input: unknown, key = uuidv7(), who?: { token: string }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call(m.h, '/actions/ai.summarize', { input }, { 'idempotency-key': key, ...(who ? { authorization: `Bearer ${who.token}` } : {}) }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));
const convSource = () => ({ source: { kind: 'conversation', conversation_id: conv.id, message_ids: [conv.message] } });

beforeAll(async () => {
  m = await matrix('ai.summarize');
  await m.credit(1000);
  conv = await m.conv({ assignee: m.sales.id, body: 'Shop ơi giá gói 10 buổi bao nhiêu? Mình cần gấp tuần này.' });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(m.h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await m?.close();
});

describe('GET /ai-utilities/:runId/result', () => {
  it('completed → chỉ đề xuất đã kiểm; chữ thô ở operation không ra API; cùng Idempotency-Key không gọi lại', async () => {
    const key = uuidv7();
    const a = await summarize(convSource(), key, m.sales);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    const runId = a.body.data.result.utility_run_id as string;
    const db = await m.db();
    const runs = await db.aiRun.count();
    const r = await get(`/ai-utilities/${runId}/result`, m.sales);
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ utility_run_id: runId, schema_version: 1, state: 'completed', proposal: a.body.data.result.proposal });
    const op = await db.utilityOperation.findUniqueOrThrow({ where: { runId } });
    expect(op).toMatchObject({ phase: 'validated', actorScope: `user:${m.sales.id}`, invocationKey: key });
    expect(JSON.stringify(r.body)).not.toContain(op.generatedPayload!);
    const again = await summarize(convSource(), key, m.sales);
    expect(again.body.data.result).toEqual(a.body.data.result);
    expect(await db.aiRun.count()).toBe(runs);
    expect(await db.utilityOperation.count({ where: { invocationKey: key } })).toBe(1);
  });

  it('người ngoài phạm vi = id lạ = run không phải tiện ích = chuỗi rác → 404; Chủ đọc được', async () => {
    const a = await summarize(convSource(), uuidv7(), m.sales);
    const runId = a.body.data.result.utility_run_id as string;
    const plain = await new RunStore(await m.db(), () => m.h.clock.now()).create({ kind: 'assistant', tier: 'standard', input: {}, title: 'thường' });
    const outsider = await get(`/ai-utilities/${runId}/result`, m.cs);
    const missing = await get(`/ai-utilities/${uuidv7()}/result`, m.sales);
    const junk = await get('/ai-utilities/not-a-uuid/result', m.sales);
    for (const r of [outsider, missing, junk]) expect(r.status).toBe(404);
    expect((await get(`/ai-utilities/${plain.id}/result`)).status).toBe(404);
    expect((await get(`/ai-utilities/${runId}/result`)).status).toBe(200);
  });

  it('cùng Idempotency-Key, input khác → 409 ở lớp idempotency executor (trước fence tiện ích), không gọi model', async () => {
    const key = uuidv7();
    await summarize(convSource(), key, m.sales);
    const db = await m.db();
    const runs = await db.aiRun.count();
    const r = await summarize({ source: { kind: 'text', text: 'nội dung khác hẳn' } }, key, m.sales);
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toMatchObject({ idempotency_key: 'mismatch' });
    expect(await db.aiRun.count()).toBe(runs);
  });
});

describe('khôi phục sau sự cố (không gọi lại model)', () => {
  const recover = () => {
    m.h.clock.advance(UTILITY_RECOVERY_GRACE_MS + 60_000);
    return recoverUtilities({ platform: m.h.platform, tenants: resolver, revalidate: makeRevalidate(resolver, m.h.platform, utilityValidatorOf), now: () => m.h.clock.now() });
  };
  /** Đưa operation đã validated về trạng thái "tiến trình chết giữa chừng": phase cũ + updated_at cũ. */
  const stall = async (runId: string, phase: 'generating' | 'validating', keepPayload: boolean) => {
    const sql = `UPDATE utility_operation SET phase = $2::utility_operation_phase, validated_result = NULL, updated_at = $3${keepPayload ? '' : ', generated_payload = NULL'} WHERE run_id = $1::uuid`;
    await (await m.db()).$executeRawUnsafe(sql, runId, phase, m.h.clock.now());
  };
  const phaseOf = async (runId: string) => (await (await m.db()).utilityOperation.findUniqueOrThrow({ where: { runId } })).phase;

  it('chưa có chữ thô → unknown; có chữ thô + nguồn còn → validated (đúng validator + tham số đã lưu)', async () => {
    const a = (await summarize(convSource(), uuidv7(), m.sales)).body.data.result.utility_run_id as string;
    const b = (await summarize({ ...convSource(), max_bullets: 2 }, uuidv7(), m.sales)).body.data.result.utility_run_id as string;
    await stall(a, 'generating', false);
    await stall(b, 'validating', true);
    const runs = await (await m.db()).aiRun.count();
    const rep = await recover();
    expect(rep.unknown).toBeGreaterThanOrEqual(1);
    expect(rep.validated).toBeGreaterThanOrEqual(1);
    expect(await phaseOf(a)).toBe('failed');
    expect((await get(`/ai-utilities/${a}/result`, m.sales)).body.data).toMatchObject({ state: 'failed', reason: 'unknown' });
    expect(await phaseOf(b)).toBe('validated');
    expect((await get(`/ai-utilities/${b}/result`, m.sales)).body.data).toMatchObject({ state: 'completed', proposal: { evidence: expect.any(Array) } });
    expect(await (await m.db()).aiRun.count()).toBe(runs);
  });

  it('tin nguồn đã thu hồi sau khi sinh → invalidated; chữ dán (không refs) → failed', async () => {
    const c = await m.conv({ assignee: m.sales.id, body: 'Mình muốn đặt lịch gói 10 buổi tuần sau.' });
    const a = (await summarize({ source: { kind: 'conversation', conversation_id: c.id, message_ids: [c.message] } }, uuidv7(), m.sales)).body.data.result.utility_run_id as string;
    const t = (await summarize({ source: { kind: 'text', text: 'Khách hỏi giá gói 10 buổi.' } }, uuidv7(), m.sales)).body.data.result.utility_run_id as string;
    await stall(a, 'validating', true);
    await stall(t, 'validating', true);
    await (await m.db()).message.update({ where: { id: c.message }, data: { recalledAt: m.h.clock.now() } });
    await recover();
    expect(await phaseOf(a)).toBe('invalidated');
    expect((await get(`/ai-utilities/${a}/result`, m.sales)).body.data).toEqual({ utility_run_id: a, schema_version: 1, state: 'invalidated' });
    expect(await phaseOf(t)).toBe('failed');
  });
});
