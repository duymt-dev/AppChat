// TIP-015g AC1–AC3 trên Postgres 16 native: (AC1) mốc giữ 24 giờ so bằng timestamptz trong SQL — còn 1 micro giây → giữ, đúng 24 giờ → hết
// giữ, mốc tương lai (đồng hồ lùi) → giữ; (AC2) auto giữ khoá họ khách khi kéo tay đồng thời → kéo tay chờ rồi thắng, không deadlock; kéo
// đi rồi kéo về (ABA) làm mới mốc → auto không đè dù giai đoạn trùng; (AC3) kéo cùng giai đoạn = no-op thật (không version / mốc / lịch sử),
// hoàn tác no-op không đụng lần đổi sau. Thiếu ràng buộc khoá họ → từ chối (không tự khoá khách sau chứng từ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { applyStageRule, lockStageFamily, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;

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
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const SYS = { type: 'system', id: null };
let n = 0;
const contact = async (stage = 'consulting') => {
  const id = (await act('contact.create', { full_name: `Khách giữ ${++n}`, phone: `09095100${String(n).padStart(2, '0')}` })).body.data.result.contact_id as string;
  await db.$executeRaw`UPDATE contact SET stage = ${stage}::contact_stage WHERE id = ${id}::uuid`;
  return id;
};
/** Đặt mốc kéo tay = now − 24h + `offset` (chuỗi interval Postgres) — giữ nguyên micro giây trong DB. */
const manualAt = (id: string, offset: string) => db.$executeRaw`UPDATE contact SET stage_set_manually_at = ${h.clock.now().toISOString()}::timestamptz - interval '24 hours' + ${offset}::interval WHERE id = ${id}::uuid`;
const raise = (id: string, to: 'quote' | 'contract' | 'won' = 'quote') =>
  db.$transaction(async (tx) => {
    await lockStageFamily(tx, id);
    return applyStageRule(tx, { contactId: id, mode: 'raise', to, actor: SYS, now: h.clock.now() });
  });
const row = (id: string) => db.contact.findUniqueOrThrow({ where: { id }, select: { stage: true, version: true, stageSetManuallyAt: true } });

describe('mốc giữ 24 giờ (AC1)', () => {
  it('còn 1 µs → giữ; đúng 24 giờ → nâng; 23:59:59.999 → giữ; mốc tương lai → giữ', async () => {
    const a = await contact();
    await manualAt(a, '1 microsecond');
    expect(await raise(a)).toEqual([]);
    expect((await row(a)).stage).toBe('consulting');
    const b = await contact();
    await manualAt(b, '0 seconds');
    expect(await raise(b)).toEqual([expect.objectContaining({ topic: 'contact.stage_changed', payload: expect.objectContaining({ to: 'quote', manual: false }) })]);
    expect((await row(b)).stage).toBe('quote');
    const c = await contact();
    await manualAt(c, '1 millisecond');
    expect(await raise(c)).toEqual([]);
    const d = await contact();
    await manualAt(d, '30 hours');
    expect(await raise(d)).toEqual([]);
    expect((await row(d)).stage).toBe('consulting');
  });

  it('nâng giữ nguyên mốc kéo tay cũ (không xoá / làm mới); Đã mua không bao giờ bị đổi', async () => {
    const a = await contact();
    await manualAt(a, '-2 hours');
    const before = (await row(a)).stageSetManuallyAt;
    await raise(a);
    expect((await row(a)).stageSetManuallyAt).toEqual(before);
    const w = await contact('won');
    expect(await raise(w, 'won')).toEqual([]);
    expect((await row(w)).stage).toBe('won');
  });

  it('không có ràng buộc khoá họ của transaction → 500, không ghi', async () => {
    const a = await contact();
    await expect(db.$transaction((tx) => applyStageRule(tx, { contactId: a, mode: 'raise', to: 'quote', actor: SYS, now: h.clock.now() }))).rejects.toMatchObject({ httpStatus: 500 });
    expect((await row(a)).stage).toBe('consulting');
  });
});

describe('đua với kéo tay (AC2)', () => {
  it('auto giữ khoá họ → kéo tay chờ rồi thắng (không deadlock); giai đoạn cuối = kéo tay', async () => {
    const a = await contact();
    let release!: () => void;
    const locked = new Promise<void>((r) => (release = r));
    const auto = db.$transaction(async (tx) => {
      await lockStageFamily(tx, a);
      release();
      await tx.$executeRaw`SELECT pg_sleep(0.5)`;
      return applyStageRule(tx, { contactId: a, mode: 'raise', to: 'quote', actor: SYS, now: h.clock.now() });
    });
    await locked;
    const manual = act('contact.set_stage', { contact_id: a, stage: 'potential' });
    const [ev, m] = await Promise.all([auto, manual]);
    expect(ev).toHaveLength(1);
    expect(m.status, JSON.stringify(m.body)).toBe(200);
    const r = await row(a);
    expect(r.stage).toBe('potential');
    expect(r.stageSetManuallyAt).not.toBeNull();
    // Sau đó auto (trong 24 giờ) không đè lựa chọn tay.
    expect(await raise(a)).toEqual([]);
  });

  it('ABA: kéo đi rồi kéo về cùng giai đoạn → mốc mới giữ, auto không đè dù giai đoạn trùng', async () => {
    const a = await contact();
    await manualAt(a, '-1 hour'); // mốc cũ đã hết giữ
    expect((await act('contact.set_stage', { contact_id: a, stage: 'lead' })).status).toBe(200);
    expect((await act('contact.set_stage', { contact_id: a, stage: 'consulting' })).status).toBe(200);
    expect(await raise(a)).toEqual([]);
    expect((await row(a)).stage).toBe('consulting');
  });
});

describe('kéo cùng giai đoạn (AC3)', () => {
  it('no-op: không version / mốc / timeline / event; hoàn tác no-op không đụng lần đổi sau', async () => {
    const a = await contact();
    await manualAt(a, '-3 hours');
    const r0 = await row(a);
    const tl0 = await db.timelineEvent.count({ where: { contactId: a } });
    const ev0 = await db.outboxEvent.count({ where: { topic: 'contact.stage_changed', payload: { path: ['contact_id'], equals: a } } });
    const same = await act('contact.set_stage', { contact_id: a, stage: 'consulting' });
    expect(same.body.data.result).toEqual({ stage: 'consulting', version: r0.version });
    expect(await row(a)).toEqual(r0);
    expect(await db.timelineEvent.count({ where: { contactId: a } })).toBe(tl0);
    expect(await db.outboxEvent.count({ where: { topic: 'contact.stage_changed', payload: { path: ['contact_id'], equals: a } } })).toBe(ev0);
    // Mốc cũ đã hết giữ → auto vẫn nâng được (no-op không tạo giữ mới).
    expect(await raise(a)).toHaveLength(1);
    const moved = await act('contact.set_stage', { contact_id: a, stage: 'lead' });
    const r1 = await row(a);
    expect((await undo(same.body.data.action_log_id)).status).toBe(200);
    expect(await row(a)).toEqual(r1);
    expect(moved.status).toBe(200);
  });
});
