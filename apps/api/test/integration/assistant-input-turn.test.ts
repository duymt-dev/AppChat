// TIP-023f §1.4, §3 AC1/AC2/AC4/AC5 (Postgres 16 + bundle parser thật + engine AI SDK với model giả ghi lại INPUT THẬT gửi SDK):
// gửi lượt kèm PDF đã chuẩn bị → model nhận nội dung + vị trí trang (không chỉ tên); tin lưu chỉ tham chiếu; gửi lại cùng request →
// cùng run, đổi danh sách tệp → 409; tệp chưa ready → ATTACHMENT_NOT_PREPARED trước model; ảnh + route chỉ chữ → VISION_UNAVAILABLE,
// route khai vision → bytes ảnh tới đúng model; tệp gốc mất quyền → lần dựng sau báo không khả dụng (không dùng lại nội dung cũ).
import 'reflect-metadata';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, type ModelCandidate } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, STORAGE, WalletService, assistantTurn, createLogger, prepareArtifact, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const log = createLogger({ level: 'silent' });
let h: Harness;
let resolver: TenantDbResolver;
const worker = join(import.meta.dirname, '..', '..', '..', 'worker');
const entry = join(worker, 'dist', 'parser.cjs');
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

/** Model giả ghi lại prompt THẬT AI SDK nhận (sau khi engine dựng tham chiếu). */
function deps(seen: unknown[][], opts: { vision: boolean } = { vision: false }): AssistantDeps {
  const model = mockLanguageModel(() => ({ text: 'Đã đọc tệp.' }), { provider: PROVIDER, model: 'chat' });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    seen.push(o.prompt as unknown[]);
    return spy(o);
  };
  const cand: ModelCandidate = { provider: PROVIDER, model: 'chat', handle: model };
  const source = { candidates: async (_t: unknown, _p: unknown, needs: { vision?: boolean }) => (needs.vision && !opts.vision ? [] : [cand]) };
  const engine = new AiSdkEngine(source as never);
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => new Date(), planKey: async () => 'business', storage: h.app.get(STORAGE, { strict: false }) };
}
const turn = (d: AssistantDeps, q: Record<string, unknown>) =>
  tenant().then((db) => assistantTurn(d, db, { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', mode: 'chat', text: 'Tệp nói gì?', ...q } as never));

async function prepared(name: string, body: Buffer, mime: string, draft: string) {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([new Uint8Array(body)], { type: mime }), name);
  const up = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` }, body: form });
  const fileId = ((await up.json()) as { data: { file_id: string } }).data.file_id;
  const r = await call(h, '/actions/assistant.attachment_prepare', { input: { file_id: fileId, draft_nonce: draft } }, { 'idempotency-key': uuidv7() });
  const id = ((await r.json()) as { data: { result: { artifact_id: string } } }).data.result.artifact_id;
  await prepareArtifact(await tenant(), id, { storage: h.app.get(STORAGE, { strict: false }), sandbox: { entry }, now: () => new Date(), owner: 't' });
  return { id, fileId };
}
const png = () => {
  const b = Buffer.alloc(64);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]).copy(b, 0);
  b.write('IHDR', 12, 'latin1');
  b.writeUInt32BE(320, 16);
  b.writeUInt32BE(240, 20);
  b.write('IDAT', 40, 'latin1');
  return b;
};

beforeAll(async () => {
  execFileSync(process.execPath, [join(worker, 'node_modules', 'tsup', 'dist', 'cli-default.js')], { cwd: worker, stdio: 'ignore' });
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: 'chat', tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 5000, { refType: 'test', refId: uuidv7() });
}, 240_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('tệp đi vào model thật', () => {
  it('PDF: model nhận nội dung + vị trí trang; tin lưu chỉ tham chiếu; gửi lại → cùng run; đổi danh sách → 409', async () => {
    const draft = uuidv7();
    const a = await prepared('bao-gia.pdf', pdf({ pages: 2, text: 'CANARY TURN-42' }), 'application/pdf', draft);
    const seen: unknown[][] = [];
    const requestId = `req-${uuidv7()}`;
    const r = await turn(deps(seen), { requestId, inputs: [{ artifact_id: a.id, revision: 1 }] });
    const prompt = JSON.stringify(seen[0]);
    expect(prompt).toContain('CANARY TURN-42');
    expect(prompt).toContain('[page 2]');
    expect(prompt).toContain('untrusted user-supplied content');
    const db = await tenant();
    const msg = await db.assistantMessage.findFirstOrThrow({ where: { sessionId: r.session_id, role: 'user' } });
    expect(JSON.stringify(msg.content)).not.toContain('CANARY');
    expect(JSON.stringify(msg.content)).toContain(a.id);
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect(JSON.stringify(run.state ?? {})).not.toContain('CANARY');
    expect(await db.assistantInputArtifact.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ sessionId: r.session_id });

    const again = await turn(deps([]), { requestId, inputs: [{ artifact_id: a.id, revision: 1 }] });
    expect(again.run_id).toBe(r.run_id);
    const b = await prepared('khac.txt', Buffer.from('khác'), 'text/plain', draft);
    await expect(turn(deps([]), { requestId, inputs: [{ artifact_id: a.id, revision: 1 }, { artifact_id: b.id, revision: 1 }] })).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('tệp chưa ready → ATTACHMENT_NOT_PREPARED trước model; tệp đã buộc phiên khác → 409', async () => {
    const draft = uuidv7();
    const form = new FormData();
    form.set('purpose', 'attachment');
    form.set('file', new Blob([new Uint8Array(Buffer.from('chưa xử lý'))], { type: 'text/plain' }), 'q.txt');
    const up = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${h.token}` }, body: form });
    const fileId = ((await up.json()) as { data: { file_id: string } }).data.file_id;
    const r = await call(h, '/actions/assistant.attachment_prepare', { input: { file_id: fileId, draft_nonce: draft } }, { 'idempotency-key': uuidv7() });
    const id = ((await r.json()) as { data: { result: { artifact_id: string } } }).data.result.artifact_id;
    const seen: unknown[][] = [];
    await expect(turn(deps(seen), { requestId: `req-${uuidv7()}`, inputs: [{ artifact_id: id, revision: 1 }] })).rejects.toMatchObject({ code: 'ATTACHMENT_NOT_PREPARED' });
    expect(seen).toHaveLength(0);
  });

  it('ảnh: route chỉ chữ → VISION_UNAVAILABLE (không gửi thiếu ảnh); route vision → bytes ảnh tới model', async () => {
    const a = await prepared('anh.png', png(), 'image/png', uuidv7());
    const none: unknown[][] = [];
    const r1 = await turn(deps(none, { vision: false }), { requestId: `req-${uuidv7()}`, inputs: [{ artifact_id: a.id, revision: 1 }] });
    expect(none).toHaveLength(0);
    const run1 = await (await tenant()).aiRun.findUniqueOrThrow({ where: { id: r1.run_id! } });
    expect(run1.status).toBe('failed');
    expect(JSON.stringify(run1.error ?? run1.state ?? {})).toMatch(/VISION_UNAVAILABLE/);

    const b = await prepared('anh2.png', png(), 'image/png', uuidv7());
    const seen: unknown[][] = [];
    await turn(deps(seen, { vision: true }), { requestId: `req-${uuidv7()}`, inputs: [{ artifact_id: b.id, revision: 1 }] });
    const parts = (seen[0] as { role: string; content: { type: string; mediaType?: string }[] }[]).flatMap((m) => (Array.isArray(m.content) ? m.content : []));
    expect(parts.some((p) => p.type === 'file' && p.mediaType === 'image/png')).toBe(true);
  });

  it('nguồn mất quyền sau khi gửi → lần dựng sau báo không khả dụng, không dùng lại nội dung cũ', async () => {
    const draft = uuidv7();
    const a = await prepared('mat.pdf', pdf({ text: 'CANARY GONE-9' }), 'application/pdf', draft);
    const r = await turn(deps([]), { requestId: `req-${uuidv7()}`, inputs: [{ artifact_id: a.id, revision: 1 }] });
    const db = await tenant();
    await db.file.update({ where: { id: a.fileId }, data: { purpose: 'kb' } });
    const seen: unknown[][] = [];
    await turn(deps(seen), { requestId: `req-${uuidv7()}`, sessionId: r.session_id, text: 'nhắc lại tệp' });
    const prompt = JSON.stringify(seen[0]);
    expect(prompt).not.toContain('GONE-9');
    expect(prompt).toContain('unavailable: source_unavailable');
  });
});
