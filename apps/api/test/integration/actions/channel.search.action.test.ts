// Ma trận channel.search (TIP-023b R2): happy (bỏ dấu, lọc loại, cờ tạm dừng, bỏ tài khoản đã ngắt, không trả credentials) · 403 (sales
// không có channels.manage) · nguồn assistant. Tài khoản dựng ở DB (luồng kết nối đã kiểm ở channels test). Idempotency / undo / trạng
// thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let zalo: string;
let mail: string;

beforeAll(async () => {
  m = await matrix('channel.search');
  const db = await m.db();
  const acc = async (type: string, name: string, status: 'connected' | 'disconnected', paused = false) => {
    const id = uuidv7();
    m.h.clock.advance(1000);
    await db.channelAccount.create({ data: { id, type, name, status, credentialsEnc: Buffer.from('secret'), pausedAt: paused ? m.h.clock.now() : null, createdAt: m.h.clock.now() } });
    return id;
  };
  zalo = await acc('zalo_personal', 'Zalo Cửa hàng', 'connected', true);
  mail = await acc('email', 'Hộp thư chăm sóc', 'connected');
  await acc('zalo_personal', 'Zalo Cũ', 'disconnected');
}, 120_000);
afterAll(() => m?.close());

describe('channel.search', () => {
  it('happy: bỏ dấu, lọc loại, cờ tạm dừng, không trả tài khoản đã ngắt / credentials', async () => {
    const r = await m.act({ type: 'zalo_personal' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.channels).toEqual([{ id: zalo, type: 'zalo_personal', name: 'Zalo Cửa hàng', status: 'connected', paused: true }]);
    expect((await m.act({ q: 'cham soc' })).body.data.result.channels.map((c: { id: string }) => c.id)).toEqual([mail]);
  });

  it('403: sales không có channels.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
