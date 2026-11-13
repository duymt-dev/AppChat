// TIP-028b pha 2 (§1, DEF-028-1) trên Postgres 16 + Memurai + LibreOffice thật: queue `doc-render`. (AC1) `quote.send` trả ngay — báo
// giá `sent`, dòng `document_render` `pending_render` + outbox `document.render_requested`, CHƯA có PDF / tin; consumer đẩy job
// `render-<id>-<thế hệ>` (lặp không nhân đôi); job render → tệp đóng băng + tin kèm PDF vào hội thoại khách → `rendered` + `document.rendered`
// + DTO `render`. (AC2) worker chết giữa render (tệp đã lưu, chưa phát hành) → job chạy lại: MỘT tệp, MỘT tin. Lỗi: còn lượt → ném (BullMQ
// thử lại); lượt 3 → `render_failed` + `document.render_failed` (mã đã làm sạch) → `quote.retry_render` (thế hệ mới) → render lại được.
// Job cũ (thế hệ trước) bỏ qua; vòng quét đẩy lại việc đứng yên; EXPLAIN vòng quét dùng index partial.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { RENDER_ATTEMPTS, docRenderConsumer, registerRenderKind, renderJobId, renderKindOf, runRender, sweepPendingRenders, uuidv7, type RenderJob } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let lan = '';

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as Body });
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: Body }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const job = (r: { id: string; generation: number }): RenderJob => ({ ws: h.ws, render_id: r.id, generation: r.generation });
const now = () => h.clock.now();
const renderOf = (quoteId: string) => db.documentRender.findUniqueOrThrow({ where: { kind_documentId: { kind: 'quote', documentId: quoteId } } });
const outOf = (conv: string) => db.message.findMany({ where: { conversationId: conv, direction: 'out' } });

async function sentQuote(name: string) {
  const q = ok(await act('quote.create', { contact_id: lan, items: [{ name, qty: 1, unit_price: '1200000', tax_rate: 8 }] }));
  ok(await act('quote.send', { quote_id: q.quote_id, channel: 'email' }));
  return q.quote_id as string;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'doc-render-queue'));
  lan = ok(await act('contact.create', { full_name: 'Chị Lan Hàng Đợi', phone: '0909 128 101', email: 'lan.queue@example.com' })).contact_id;
  await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC1 — phát hành trả ngay, PDF có sau job', () => {
  it('quote.send: sent + pending_render + outbox, chưa PDF / tin; consumer đẩy job tất định; job → tệp + tin + rendered + DTO', async () => {
    const id = await sentQuote('Gói AC1');
    const q = await db.quote.findUniqueOrThrow({ where: { id } });
    expect(q).toMatchObject({ status: 'sent', fileId: null, sentChannel: 'email' });
    const r = await renderOf(id);
    expect(r).toMatchObject({ status: 'pending_render', generation: 1, attempts: 0, fileId: null });
    expect(r.request).toMatchObject({ channel: 'email', format: 'pdf', sender: { type: 'user', id: h.user } });
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'document.render_requested' }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ render_id: r.id, kind: 'quote', document_id: id, generation: 1 });
    expect(await db.message.count({ where: { direction: 'out', body: { contains: q.code } } })).toBe(0);
    const dto = (await call(h, `/quotes/${id}`).then(json)).body.data;
    expect(dto.render).toEqual({ status: 'pending_render', error: null });

    // Consumer `documents.render`: event → job id tất định; relay chạy lại → cùng job.
    const pushed: RenderJob[] = [];
    const c = docRenderConsumer({ push: async (j) => void pushed.push(j) });
    const e = { id: ev.id, topic: ev.topic, workspaceId: h.ws, payload: ev.payload as Record<string, unknown>, traceId: null };
    await c.handle(e, db);
    await c.handle(e, db);
    expect(pushed).toEqual([job(r), job(r)]);
    expect(renderJobId(r.id, 1)).toBe(`render-${r.id}-1`);

    const res = await runRender(db, job(r), 1, now);
    expect(res.status).toBe('rendered');
    expect(res.out).toHaveLength(1);
    const after = await db.quote.findUniqueOrThrow({ where: { id } });
    expect(after.fileId).toBeTruthy();
    expect(after.fileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await db.file.findUniqueOrThrow({ where: { id: after.fileId! } })).toMatchObject({ mime: 'application/pdf', confirmed: true });
    const msgs = await outOf(after.conversationId!);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ kind: 'file', senderType: 'user', senderId: h.user });
    expect(await renderOf(id)).toMatchObject({ status: 'rendered', fileId: after.fileId, attempts: 1 });
    expect(await db.outboxEvent.count({ where: { topic: 'document.rendered' } })).toBeGreaterThanOrEqual(1);
    expect((await call(h, `/quotes/${id}`).then(json)).body.data.render).toEqual({ status: 'rendered', error: null });
    // Chạy lại job đã xong → bỏ qua, không tin thứ hai.
    expect((await runRender(db, job(r), 1, now)).status).toBe('skipped');
    expect(await outOf(after.conversationId!)).toHaveLength(1);
  }, 180_000);
});

describe('AC2 — worker chết giữa render', () => {
  it('tệp đã lưu nhưng chưa phát hành → job chạy lại: một tệp, một tin', async () => {
    const id = await sentQuote('Gói AC2');
    const r = await renderOf(id);
    const real = renderKindOf('quote')!;
    // Lượt 1: render + lưu tệp xong thì "chết" (ném trước khi phát hành) — mô phỏng worker bị kill sau LibreOffice.
    registerRenderKind('quote', { render: real.render, publish: async () => { throw new Error('worker killed'); } });
    try {
      await expect(runRender(db, job(r), 1, now)).rejects.toThrow('worker killed');
    } finally {
      registerRenderKind('quote', real);
    }
    const files = await db.file.count({ where: { purpose: 'document', mime: 'application/pdf' } });
    expect(await renderOf(id)).toMatchObject({ status: 'pending_render', attempts: 1, fileId: null });
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).fileId).toBeNull();
    // BullMQ chạy lại (stalled / retry) → cùng id tệp tất định: không thêm tệp; phát hành một lần.
    expect((await runRender(db, job(r), 2, now)).status).toBe('rendered');
    expect(await db.file.count({ where: { purpose: 'document', mime: 'application/pdf' } })).toBe(files);
    const q = await db.quote.findUniqueOrThrow({ where: { id } });
    expect((await outOf(q.conversationId!)).filter((m) => m.body.includes(q.code))).toHaveLength(1);
  }, 180_000);
});

describe('lỗi → thử lại 3 lần → render_failed → Thử lại', () => {
  it('còn lượt → ném; lượt cuối → render_failed + event mã sạch; retry_render → thế hệ 2, job cũ bỏ qua, render lại được', async () => {
    const id = await sentQuote('Gói lỗi');
    const r = await renderOf(id);
    const real = renderKindOf('quote')!;
    registerRenderKind('quote', { render: async () => { throw new Error('soffice exited 1 /tmp/secret'); }, publish: real.publish });
    try {
      await expect(runRender(db, job(r), 1, now)).rejects.toThrow('soffice');
      await expect(runRender(db, job(r), 2, now)).rejects.toThrow('soffice');
      expect((await runRender(db, job(r), RENDER_ATTEMPTS, now)).status).toBe('failed');
    } finally {
      registerRenderKind('quote', real);
    }
    expect(await renderOf(id)).toMatchObject({ status: 'render_failed', attempts: 3, error: 'RENDER_FAILED' });
    const ev = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'document.render_failed' }, orderBy: { createdAt: 'desc' } });
    expect(ev.payload).toMatchObject({ document_id: id, error: 'RENDER_FAILED' });
    expect(JSON.stringify(ev.payload)).not.toContain('secret');
    expect((await call(h, `/quotes/${id}`).then(json)).body.data.render).toEqual({ status: 'render_failed', error: 'RENDER_FAILED' });

    ok(await act('quote.retry_render', { quote_id: id }));
    const r2 = await renderOf(id);
    expect(r2).toMatchObject({ status: 'pending_render', generation: 2, attempts: 0, error: null });
    expect((await act('quote.retry_render', { quote_id: id })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { render: 'pending_render' } });
    expect((await runRender(db, job(r), 1, now)).status).toBe('skipped');
    expect((await runRender(db, job(r2), 1, now)).status).toBe('rendered');
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).fileId).toBeTruthy();
  }, 180_000);

  it('báo giá không còn hợp lệ lúc phát hành (đã chốt / đã xoá) → render_failed ngay (lỗi vĩnh viễn, không thử lại)', async () => {
    const id = await sentQuote('Gói đã chốt');
    ok(await act('quote.mark_accepted', { quote_id: id }));
    const r = await renderOf(id);
    expect((await runRender(db, job(r), 1, now)).status).toBe('failed');
    expect(await renderOf(id)).toMatchObject({ status: 'render_failed', error: 'INVALID_STATE:quote_id' });
  }, 120_000);
});

describe('vòng quét khôi phục', () => {
  it('pending_render đứng yên > 2 phút → đẩy lại đúng (id, thế hệ); EXPLAIN dùng document_render_pending_idx', async () => {
    const id = await sentQuote('Gói kẹt');
    const r = await renderOf(id);
    await db.documentRender.update({ where: { id: r.id }, data: { updatedAt: new Date(now().getTime() - 5 * 60_000) } });
    const pushed: RenderJob[] = [];
    const platform = { workspace: { findMany: () => h.platform.workspace.findMany({ where: { id: h.ws }, select: { id: true } }) } } as never;
    expect(await sweepPendingRenders({ platform, tenants: resolver, queue: { push: async (j) => void pushed.push(j) }, now })).toBe(1);
    expect(pushed).toEqual([job(r)]);
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT id, generation FROM document_render WHERE status = 'pending_render' AND updated_at < now() ORDER BY updated_at LIMIT 100`);
    });
    expect(plan.map((p) => p['QUERY PLAN']).join('\n')).toContain('document_render_pending_idx');
    await runRender(db, job(r), 1, now);
  }, 120_000);
});
