// Ma trận group.copy_link (TIP-025b P7 §A.6 — đọc link tham gia, lệnh đọc bền). Chỉ người bấm trên UI: nguồn Trợ lý → 403 · thiếu
// inbox.manage (sales) → 403 · id lạ → 404 · hội thoại 1-1 → 409 · lệnh queued gắn người yêu cầu. Luồng kênh thật (fake Zalo, worker,
// URL mã hoá + 10 phút) ở inbox-group-board.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { id: string; account: string; message: string };

beforeAll(async () => {
  m = await matrix('group.copy_link');
  c = await m.conv({ channel: 'zalo_personal' });
  await (await m.db()).conversation.update({ where: { id: c.id }, data: { kind: 'group', groupAiPolicy: 'mention' } });
}, 120_000);
afterAll(() => m?.close());

describe('group.copy_link', () => {
  it('happy (UI): lệnh queued của chính người bấm', async () => {
    const r = await m.act({ conversation_id: c.id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const row = await (await m.db()).groupCommand.findUniqueOrThrow({ where: { id: r.body.data.result.command_id } });
    expect([row.kind, row.status, row.actorId]).toEqual(['link', 'queued', m.h.user]);
  });

  it('nguồn Trợ lý → 403 · sales → 403 · id lạ → 404 · 1-1 → 409', async () => {
    expect((await m.act({ conversation_id: c.id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act({ conversation_id: c.id }, m.sales)).status).toBe(403);
    expect((await m.act({ conversation_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    const d = await m.conv({ channel: 'zalo_personal' });
    expect((await m.act({ conversation_id: d.id })).status).toBe(409);
  });

  it('không cấp agent; ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
