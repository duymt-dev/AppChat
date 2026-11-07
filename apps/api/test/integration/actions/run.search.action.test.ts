// Ma trận run.search (TIP-023b R2 · DC-308): happy (lọc đang chạy / xong, không trả input / output) · scope (không có ai.governance → chỉ
// run mình khởi tạo; owner thấy hết) · 403 (vai trò không có assistant.use) · nguồn assistant. Run dựng ở DB (sinh bởi runtime AI —
// đã kiểm ở ai-runtime test). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let live: string;
let done: string;
let mine: string;

beforeAll(async () => {
  m = await matrix('run.search');
  const db = await m.db();
  const run = async (title: string, status: 'running' | 'completed', by: string) => {
    const id = uuidv7();
    m.h.clock.advance(1000);
    await db.aiRun.create({ data: { id, rootRunId: id, kind: 'assistant', title, status, initiatedByUserId: by, creditsUsed: 3, input: { secret: 'x' }, startedAt: m.h.clock.now() } });
    return id;
  };
  done = await run('Tóm tắt hộp thư', 'completed', m.h.user);
  live = await run('Gửi báo giá hàng loạt', 'running', m.h.user);
  mine = await run('Tra khách quen', 'completed', m.sales.id);
}, 120_000);
afterAll(() => m?.close());

const ids = (r: { body: { data: { result: { runs: { id: string }[] } } } }) => r.body.data.result.runs.map((x) => x.id);

describe('run.search', () => {
  it('happy: mới trước, lọc đang chạy / xong, không trả input / output', async () => {
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(ids(r)).toEqual([mine, live, done]);
    expect(Object.keys(r.body.data.result.runs[0]).sort()).toEqual(['credits', 'id', 'kind', 'started_at', 'status', 'title']);
    expect(ids(await m.act({ status: 'running' }))).toEqual([live]);
    expect(ids(await m.act({ status: 'done' }))).toEqual([mine, done]);
  });

  it('scope: sales (không ai.governance) chỉ thấy run mình khởi tạo', async () => {
    expect(ids(await m.act({}, m.sales))).toEqual([mine]);
    expect(ids(await m.act({}, m.cs))).toEqual([]);
  });

  it('403: vai trò không có assistant.use', async () => {
    await (await m.db()).role.create({ data: { id: uuidv7(), key: 'custom:crm_viewer', name: 'Xem khách', permissions: ['crm.view'], dataScope: { crm: 'all' } } });
    expect((await m.act({}, await m.h.member('custom:crm_viewer'))).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
