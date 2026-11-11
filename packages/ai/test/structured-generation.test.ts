// TIP-021b §2.2: chế độ sinh theo schema của AiSdkEngine — một lời gọi không tool, cùng hook biên nhận 019b, usage ghi TRƯỚC khi kiểm
// khuôn, sai khuôn = lỗi rõ (không sửa ngầm, không gọi lần hai), trộn tool bị từ chối trước khi gọi provider, không phát delta JSON thô.
import { describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, schemaError, staticModelSource, type AttemptInfo, type AttemptOutcome, type ModelSource, type MockScript, type ResponseSchema, type RunEvent, type RunRequest } from '../src';

const SCHEMA: ResponseSchema = {
  name: 'agent_draft',
  version: 1,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'tools'],
    properties: {
      name: { type: 'string', maxLength: 20 },
      tools: { type: 'array', maxItems: 3, items: { type: 'string', enum: ['ticket.create', 'appointment.create'] } },
      threshold: { type: 'integer', minimum: 50, maximum: 95 },
    },
  },
};

const req = (p: Partial<RunRequest> = {}): RunRequest => ({
  runId: 'r1', workspaceId: 'ws', system: 'Soạn cấu hình.', messages: [{ role: 'user', content: 'Agent CSKH' }], tools: [], tier: 'standard', maxSteps: 1, budget: { maxCredits: 1000 }, responseSchema: SCHEMA, ...p,
});

function harness(script: MockScript, source?: ModelSource) {
  const model = mockLanguageModel(script);
  const engine = new AiSdkEngine(source ?? staticModelSource([{ provider: 'mock', model: 'm1', handle: model }]));
  const attempts: { a: AttemptInfo; o?: AttemptOutcome }[] = [];
  const hooks = {
    beforeAttempt: async (a: AttemptInfo) => void attempts.push({ a }),
    afterAttempt: async (a: AttemptInfo, o: AttemptOutcome) => (attempts.push({ a, o }), { credits: o.kind === 'usage' ? 3 : 0 }),
  };
  const run = async (r: RunRequest) => {
    const ev: RunEvent[] = [];
    for await (const e of engine.run({ ...r, hooks }, new AbortController().signal)) ev.push(e);
    return ev;
  };
  return { attempts, run };
}

describe('AiSdkEngine — chế độ schema (TIP-021b)', () => {
  it('JSON đúng khuôn → finish.text là JSON chuẩn, usage trước finish, không delta thô', async () => {
    const h = harness([{ text: '  {"name":"CSKH","tools":["ticket.create"],"threshold":80}\n', tokensIn: 40, tokensOut: 12 }]);
    const ev = await h.run(req());
    expect(ev.some((e) => e.type === 'delta')).toBe(false);
    expect(ev.map((e) => e.type)).toEqual(['usage', 'finish']);
    expect(ev[0]).toMatchObject({ type: 'usage', credits: 3, usage: { tokensIn: 40, tokensOut: 12 } });
    expect(ev[1]).toMatchObject({ type: 'finish', reason: 'stop', text: '{"name":"CSKH","tools":["ticket.create"],"threshold":80}' });
    expect(h.attempts.map((x) => x.o?.kind ?? 'before')).toEqual(['before', 'usage']);
  });

  it.each([
    ['không phải JSON', 'Đây là cấu hình: {name}', 'not_json'],
    ['key lạ', '{"name":"A","tools":[],"grant":"all"}', '$.grant: unknown_key'],
    ['tool ngoài enum ứng viên', '{"name":"A","tools":["contact.delete"]}', '$.tools[0]: enum'],
    ['ngưỡng ngoài khoảng', '{"name":"A","tools":[],"threshold":20}', '$.threshold: minimum'],
    ['vượt độ dài', `{"name":"${'x'.repeat(21)}","tools":[]}`, '$.name: max_length'],
    ['thiếu trường bắt buộc', '{"name":"A"}', '$.tools: required'],
  ])('sai khuôn (%s) → usage đã ghi rồi lỗi STRUCTURED_MALFORMED, một lời gọi duy nhất', async (_n, text, reason) => {
    const h = harness([{ text, tokensIn: 30, tokensOut: 9 }, { text: '{"name":"A","tools":[]}' }]);
    const ev = await h.run(req());
    expect(ev.map((e) => e.type)).toEqual(['usage', 'error']);
    expect(ev[1]).toMatchObject({ type: 'error', code: 'STRUCTURED_MALFORMED', message: reason });
    expect(h.attempts.filter((x) => !x.o)).toHaveLength(1);
  });

  it('trộn tool với schema → từ chối trước khi nhận chỗ / gọi provider', async () => {
    const h = harness([{ text: '{}' }]);
    const tool = { name: 't', description: 't', inputSchema: { type: 'object' }, origin: 'meta' as const, execute: async () => ({ kind: 'ok' as const, output: null }) };
    const ev = await h.run(req({ tools: [tool] }));
    expect(ev).toEqual([{ type: 'error', code: 'STRUCTURED_MIXED_MODE', message: expect.any(String), stepIdx: 0 }]);
    expect(h.attempts).toEqual([]);
  });

  it('có route chat nhưng không route khai json_schema → STRUCTURED_UNSUPPORTED, không gọi model', async () => {
    const model = mockLanguageModel([{ text: '{}' }]);
    const source: ModelSource = { candidates: async (_t, _p, needs) => (needs.structured ? [] : [{ provider: 'p', model: 'm', handle: model }]) };
    const h = harness([], source);
    const ev = await h.run(req());
    expect(ev).toMatchObject([{ type: 'error', code: 'STRUCTURED_UNSUPPORTED' }]);
    expect(h.attempts).toEqual([]);
  });

  it('không route chat nào → NO_MODEL_ROUTE (giữ mã cũ)', async () => {
    const h = harness([], { candidates: async () => [] });
    expect(await h.run(req())).toMatchObject([{ type: 'error', code: 'NO_MODEL_ROUTE' }]);
  });

  it('ứng viên đầu 503 (bị từ chối rõ) → fallback ứng viên kế qua cùng hook, kết quả hợp lệ', async () => {
    const bad = mockLanguageModel([{ error: { statusCode: 503 } }]);
    const good = mockLanguageModel([{ text: '{"name":"B","tools":["appointment.create"]}' }]);
    const h = harness([], staticModelSource([{ provider: 'a', model: 'x', handle: bad }, { provider: 'b', model: 'y', handle: good }]));
    const ev = await h.run(req());
    expect(ev.at(-1)).toMatchObject({ type: 'finish', text: '{"name":"B","tools":["appointment.create"]}' });
    expect(h.attempts.map((x) => `${x.a.provider}:${x.o?.kind ?? 'before'}`)).toEqual(['a:before', 'a:rejected', 'b:before', 'b:usage']);
  });

  it('chế độ thường không đổi: không schema → chữ phát delta như cũ', async () => {
    const h = harness([{ text: 'Chào chị' }]);
    const ev = await h.run(req({ responseSchema: undefined }));
    expect(ev.filter((e) => e.type === 'delta')).toHaveLength(1);
    expect(ev.at(-1)).toMatchObject({ type: 'finish', text: 'Chào chị' });
  });
});

describe('schemaError — tập con JSON Schema đóng', () => {
  it('enum rỗng = mảng tool rỗng hợp lệ, phần tử bất kỳ bị từ chối', () => {
    const s = { type: 'array', maxItems: 0, items: { type: 'string', enum: [] } };
    expect(schemaError(s, [])).toBeNull();
    expect(schemaError(s, ['x'])).toBe('$: max_items');
  });
  it('kiểu lạ trong schema là lỗi cấu hình, không bỏ qua', () => {
    expect(schemaError({ type: 'null' }, null)).toBe('$: schema_type_unsupported');
    expect(schemaError({ type: 'integer' }, 1.5)).toBe('$: integer');
  });
});
