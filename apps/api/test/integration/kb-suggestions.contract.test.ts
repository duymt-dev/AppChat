// TIP-043 — contract FE ↔ BE hàng chờ học từ hội thoại trên HTTP thật (Postgres 16): GET /v1/kb/suggestions (+ /:id) parse đúng zod dùng
// chung với mock FE (`@appchat/shared` api/kb-suggestions), output kb.suggestion.approve / reject parse đúng `output` của ActionDef, lỗi theo
// envelope `{ error: { code, message, fields? } }` với mã trong ERROR_CODES (còn SĐT → 422 fields.answer, version lệch, đã duyệt, không tồn
// tại), event outbox kb.suggestion_* parse đúng EVENT_SCHEMAS và chỉ mang id. Đổi DTO một phía mà không đổi schema chung → file này đỏ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { getAction } from '@appchat/actions';
import { ERROR_CODES, EVENT_SCHEMAS, kbSuggestionListSchema, kbSuggestionSchema } from '@appchat/shared';
import { ActionExecutor, KB_SUGGEST_ACTOR, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (path: string) => call(h, path).then(json);
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const outputOf = (id: string, result: unknown) => getAction(id)!.output.safeParse(result);
const errorEnvelope = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string(), fields: z.record(z.string(), z.string()).optional() }).strict() }).strict();
const parsed = <T extends z.ZodTypeAny>(s: T, v: unknown) => {
  const r = s.safeParse(v);
  return r.success ? 'ok' : r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

/** Hội thoại đóng (khách hỏi, nhân viên đáp) + `kb.suggestion.propose` qua executor nguồn system → id đề xuất pending. */
async function pending(question: string): Promise<string> {
  const db = await tenant();
  const acc = uuidv7();
  await db.channelAccount.create({ data: { id: acc, type: 'webchat', name: 'Web', status: 'connected', settings: {}, createdAt: h.clock.now() } });
  const conv = uuidv7();
  await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, status: 'closed' } });
  const msg = async (senderType: 'contact' | 'user', body: string) => {
    const id = uuidv7();
    h.clock.advance(1000);
    await db.message.create({ data: { id, conversationId: conv, channelAccountId: acc, direction: senderType === 'contact' ? 'in' : 'out', senderType, body, status: 'delivered', createdAt: h.clock.now() } });
    return id;
  };
  const q = await msg('contact', question);
  const a = await msg('user', 'Dạ đổi trước 24 giờ, miễn phí ạ.');
  const ctx = { workspaceId: h.ws, source: 'system' as const, actor: { type: 'system' as const, id: KB_SUGGEST_ACTOR }, authz: { isOwner: true } as never };
  const r = await h.app.get(ActionExecutor, { strict: false }).execute(ctx, 'kb.suggestion.propose', {
    conversation_id: conv,
    cutoff_message_id: a,
    run_id: null,
    pairs: [{ question, answer: 'Đổi trước 24 giờ, miễn phí.', source_message_ids: [q, a] }],
  });
  const result = (r.data as { result: unknown }).result;
  expect(outputOf('kb.suggestion.propose', result).success).toBe(true);
  return (result as { created: string[] }).created[0]!;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('GET /v1/kb/suggestions ↔ zod chung', () => {
  it('list theo trạng thái (meta.pending, next_cursor) · chi tiết /:id', async () => {
    const id = await pending('Đổi lịch hẹn được không?');
    await pending('Có chỗ gửi xe không?');
    const page = await get('/kb/suggestions?status=pending&limit=1');
    expect(page.status).toBe(200);
    expect(parsed(kbSuggestionListSchema, page.body)).toBe('ok');
    expect(page.body.meta.pending).toBeGreaterThanOrEqual(2);
    expect(page.body.next_cursor).toEqual(expect.any(String));
    expect(parsed(kbSuggestionListSchema, (await get('/kb/suggestions?status=approved')).body)).toBe('ok');
    expect(parsed(kbSuggestionSchema, (await get(`/kb/suggestions/${id}`)).body.data)).toBe('ok');
  });

  it('lỗi theo envelope chung: status lạ 400, id lạ 404', async () => {
    const bad = await get('/kb/suggestions?status=weird');
    expect(bad.status).toBe(400);
    expect(parsed(errorEnvelope, bad.body)).toBe('ok');
    const nf = await get(`/kb/suggestions/${uuidv7()}`);
    expect(nf.status).toBe(404);
    expect(parsed(errorEnvelope, nf.body)).toBe('ok');
  });
});

describe('action output / lỗi ↔ ActionDef + envelope', () => {
  it('approve (sửa đáp án) · reject khớp output; còn SĐT 422 fields.answer; version lệch; đã duyệt; không tồn tại', async () => {
    const a = await pending('Đổi lịch mất phí không?');
    const phone = await act('kb.suggestion.approve', { suggestion_id: a, if_version: 1, answer: 'Gọi 0909123456 nhé' });
    expect(phone.status).toBe(422);
    expect(parsed(errorEnvelope, phone.body)).toBe('ok');
    expect(phone.body.error.fields).toMatchObject({ answer: expect.stringMatching(/^sensitive_data/) });
    const stale = await act('kb.suggestion.approve', { suggestion_id: a, if_version: 9 });
    expect(stale.status).toBe(409);
    expect(parsed(errorEnvelope, stale.body)).toBe('ok');
    const ok = await act('kb.suggestion.approve', { suggestion_id: a, if_version: 1, answer: 'Đổi trước 24 giờ không mất phí.' });
    expect(ok.status).toBe(200);
    expect(outputOf('kb.suggestion.approve', ok.body.data.result).success).toBe(true);
    const again = await act('kb.suggestion.approve', { suggestion_id: a, if_version: 2 });
    expect(again.status).toBe(409);
    expect(parsed(errorEnvelope, again.body)).toBe('ok');

    const r = await pending('Có nhận thẻ tín dụng không?');
    const rej = await act('kb.suggestion.reject', { suggestion_id: r, if_version: 1, reason: 'Chưa chắc chắn' });
    expect(rej.status).toBe(200);
    expect(outputOf('kb.suggestion.reject', rej.body.data.result).success).toBe(true);
    const nf = await act('kb.suggestion.reject', { suggestion_id: uuidv7(), if_version: 1 });
    expect(nf.status).toBe(404);
    expect(parsed(errorEnvelope, nf.body)).toBe('ok');
    const extra = await act('kb.suggestion.reject', { suggestion_id: r, if_version: 2, note: 'x' });
    expect(extra.status).toBe(422);
    expect(parsed(errorEnvelope, extra.body)).toBe('ok');
  });
});

describe('outbox event ↔ EVENT_SCHEMAS', () => {
  it('kb.suggestion_created · _approved · _rejected parse đúng và không mang câu hỏi / đáp án', async () => {
    const db = await tenant();
    for (const topic of ['kb.suggestion_created', 'kb.suggestion_approved', 'kb.suggestion_rejected'] as const) {
      const rows = await db.outboxEvent.findMany({ where: { topic }, orderBy: { createdAt: 'desc' }, take: 5 });
      expect(rows.length, topic).toBeGreaterThan(0);
      for (const e of rows) {
        expect(parsed(EVENT_SCHEMAS[topic], e.payload), topic).toBe('ok');
        expect(JSON.stringify(e.payload), topic).not.toMatch(/Đổi|thẻ tín dụng|miễn phí/);
      }
    }
  });
});
