// Ma trận channel.status (TIP-023c, khối `qr`): happy (tài khoản Zalo đang kết nối → trạng thái lần đăng nhập, KHÔNG ảnh / credential) ·
// 403 (sales không có channels.manage) · tài khoản lạ / đã ngắt → 404 · nguồn assistant chạy ngay (risk read). Idempotency / undo: không áp dụng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let zalo: string;
let mail: string;
let gone: string;

beforeAll(async () => {
  m = await matrix('channel.status');
  const db = await m.db();
  const acc = async (type: string, name: string, status: 'connected' | 'connecting' | 'disconnected') => {
    const id = uuidv7();
    m.h.clock.advance(1000);
    await db.channelAccount.create({ data: { id, type, name, status, credentialsEnc: Buffer.from('SENTINEL-CRED'), createdAt: m.h.clock.now() } });
    return id;
  };
  zalo = await acc('zalo_personal', 'Zalo Shop', 'connected');
  mail = await acc('email', 'Hộp thư', 'connected');
  gone = await acc('zalo_personal', 'Zalo Cũ', 'disconnected');
}, 120_000);
afterAll(() => m?.close());

describe('channel.status', () => {
  it('happy: trạng thái tài khoản + lần đăng nhập; không credential / ảnh QR', async () => {
    const r = await m.act({ channel_account_id: zalo });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ channel_account_id: zalo, type: 'zalo_personal', account_status: 'connected', login: { status: 'connected', terminal: true, qr_ref: null } });
    expect(JSON.stringify(r.body)).not.toContain('SENTINEL-CRED');
    expect((await m.act({ channel_account_id: mail })).body.data.result.login).toBeNull();
  });

  it('403: sales không có channels.manage', async () => {
    expect((await m.act({ channel_account_id: zalo }, m.sales)).status).toBe(403);
  });

  it('404: tài khoản lạ / đã ngắt', async () => {
    expect((await m.act({ channel_account_id: gone })).status).toBe(404);
    expect((await m.act({ channel_account_id: uuidv7() })).status).toBe(404);
  });

  it('nguồn assistant chạy ngay (read)', async () => {
    expect((await m.act({ channel_account_id: zalo }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
