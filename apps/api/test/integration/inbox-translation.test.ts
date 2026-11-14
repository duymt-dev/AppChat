// TIP-025b §F (HTTP thật + model giả + Postgres): ai.translate giữ hợp đồng cũ và mở đích zh/ko/ja; tin vào dịch lại cùng người = cache
// (một run, một lần trừ credit); người khác không dùng cache của người kia; epoch quyền tăng → không dùng lại; không có dòng cache treo;
// dọn cache hết hạn theo workspace. Hết credit / lỗi model bỏ chỗ giữ: unit packages/core/test/inbox-translation.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletService, cleanupTranslationCache, uuidv7 } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;
let c: { id: string; message: string };

beforeAll(async () => {
  m = await matrix('ai.translate');
  await m.h.app.get(WalletService, { strict: false }).topup(m.h.ws, 1000, { refType: 'test', refId: uuidv7() });
  c = await m.conv({ body: '你好，价格多少？' });
}, 120_000);
afterAll(() => m?.close());

const runs = async () => (await m.db()).aiRun.count({ where: { title: 'ai.translate' } });

describe('inbox translation', () => {
  it('đích zh/ko/ja hợp lệ; dịch lại cùng người = cache (không thêm run)', async () => {
    for (const to of ['zh', 'ko', 'ja', 'vi']) {
      const r = await m.act({ conversation_id: c.id, message_id: c.message, to });
      expect(r.status, JSON.stringify(r.body)).toBe(200);
      expect(r.body.data.result.text).toBe(`[${to.toUpperCase()}] 你好，价格多少？`);
    }
    const before = await runs();
    expect((await m.act({ conversation_id: c.id, message_id: c.message, to: 'vi' })).status).toBe(200);
    expect(await runs()).toBe(before);
  });

  it('người khác (manager) không dùng cache của Owner; epoch quyền tăng → gọi lại model', async () => {
    const before = await runs();
    expect((await m.act({ conversation_id: c.id, message_id: c.message, to: 'vi' }, await m.h.member('manager'))).status).toBe(200);
    expect(await runs()).toBe(before + 1);
    await m.h.platform.workspace.update({ where: { id: m.h.ws }, data: { authzEpoch: { increment: 1 } } });
    expect((await m.act({ conversation_id: c.id, message_id: c.message, to: 'vi' })).status).toBe(200);
    expect(await runs()).toBe(before + 2);
  });

  it('không dòng cache treo sau các lượt; dọn hết hạn theo workspace', async () => {
    const db = await m.db();
    expect(await db.translationCache.count({ where: { status: 'pending' } })).toBe(0);
    await db.translationCache.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const purged = await cleanupTranslationCache({ platform: { workspace: { findMany: async () => [{ id: m.h.ws }] } } as never, tenants: { get: () => m.db() } as never, now: () => new Date() });
    expect(purged).toBeGreaterThan(0);
    expect(await db.translationCache.count()).toBe(0);
  });
});
