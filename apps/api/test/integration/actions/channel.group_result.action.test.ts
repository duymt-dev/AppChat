// Ma trận channel.group_result (TIP-023b SPEC D): callback system-only của worker tạo nhóm. HTTP (ui / assistant / api) → 403 dù là Owner;
// nguồn system từ header bị từ chối (422 — HTTP chỉ nhận ui / assistant / api); ẩn khỏi danh mục Trợ lý + tool agent. Luồng thật (worker →
// executor → hội thoại nhóm, kết quả lặp không đổi, unknown giữ nguyên) kiểm ở conversation-groups.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYSTEM_ONLY, assistantAllows, uuidv7 } from '@appchat/core';
import { authzForRole } from '@appchat/shared';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let req: string;

beforeAll(async () => {
  m = await matrix('channel.group_result');
  req = uuidv7();
  const acc = (await m.conv({ channel: 'zalo_personal' })).account;
  await (await m.db()).conversationGroupRequest.create({ data: { id: req, channelAccountId: acc, name: 'Nhóm', participants: [], payloadDigest: 'x' } });
}, 120_000);
afterAll(() => m?.close());

describe('channel.group_result', () => {
  it('Owner qua HTTP (ui / assistant) → 403; header system → 422; request không đổi', async () => {
    expect((await m.act({ request_id: req, outcome: 'succeeded', group_id: 'g1' })).status).toBe(403);
    expect((await m.act({ request_id: req, outcome: 'failed' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await m.act({ request_id: req, outcome: 'failed' }, undefined, { 'x-action-source': 'system' })).status).toBe(422);
    expect((await (await m.db()).conversationGroupRequest.findUniqueOrThrow({ where: { id: req } })).status).toBe('queued');
  });

  it('không agentGrantable, ẩn khỏi Trợ lý kể cả Owner', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(SYSTEM_ONLY.has('channel.group_result')).toBe(true);
    expect(assistantAllows(m.def, authzForRole('owner', 'u1'))).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
