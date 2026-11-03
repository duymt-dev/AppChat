// TIP-023c hợp đồng 1 (QR attempt): mỗi lần kết nối một attempt; sự kiện của lần cũ không ghi đè lần mới; channel.status không có ảnh QR,
// chỉ `qr_ref` đúng attempt khi đang chờ; map starting→waiting, declined→failed(reason); ảnh QR của lần cũ → 404.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ChannelControl } from '../src/channels/services/control';
import { channelStatusOf, loginDto, qrImageOf } from '../src/channels/services/login-attempt';

const ACC = '0190f000-0000-7000-8000-0000000000a1';

function rig(status = 'connecting', type = 'zalo_personal') {
  const m = new Map<string, string>();
  const redis = { publish: async () => 0, get: async (k: string) => m.get(k) ?? null, set: async (k: string, v: string) => (m.set(k, v), 'OK'), exists: async () => 0, del: async (k: string) => (m.delete(k) ? 1 : 0) };
  const jobs: unknown[] = [];
  const control = new ChannelControl(redis as never, { add: async (_n: string, d: unknown) => (jobs.push(d), {}) } as never);
  const db = { channelAccount: { findUnique: async ({ where }: { where: { id: string } }) => (where.id === ACC ? { id: ACC, type, name: 'Zalo Shop', status } : null) } } as never;
  return { control, db, jobs, m };
}

describe('attempt', () => {
  it('startLogin tạo attempt mới mỗi lần; job mang attempt', async () => {
    const r = rig();
    const a1 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: 'u1' });
    const a2 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: 'u1' });
    expect(a1).not.toBe(a2);
    expect(r.jobs).toMatchObject([{ attempt: a1 }, { attempt: a2 }]);
    expect((await r.control.login(ACC))?.attempt).toBe(a2);
  });

  it('sự kiện trễ của lần cũ không ghi đè lần mới; rev tăng', async () => {
    const r = rig();
    const a1 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: null });
    const a2 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: null });
    expect(await r.control.setLogin({ account_id: ACC, status: 'connected', qr: null, expires_at: null, attempt: a1 })).toBe(false);
    expect(await r.control.setLogin({ account_id: ACC, status: 'waiting', qr: 'PNGDATA', expires_at: 'x', attempt: a2 })).toBe(true);
    const s = await r.control.login(ACC);
    expect(s).toMatchObject({ status: 'waiting', attempt: a2, rev: 1 });
  });
});

describe('channel.status DTO', () => {
  it('đang chờ: không ảnh, qr_ref đúng attempt; starting → waiting; declined → failed reason', async () => {
    const r = rig();
    const a = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: null });
    expect((await channelStatusOf(r.db, r.control, ACC)).login).toMatchObject({ status: 'waiting', qr_ref: null, terminal: false });
    await r.control.setLogin({ account_id: ACC, status: 'waiting', qr: 'PNGDATA', expires_at: '2026-11-03T10:00:00Z', attempt: a });
    const st = await channelStatusOf(r.db, r.control, ACC);
    expect(JSON.stringify(st)).not.toContain('PNGDATA');
    expect(st.login).toMatchObject({ status: 'waiting', attempt: a, qr_ref: `/assistant/ui/qr/${ACC}?attempt=${a}` });
    expect(loginDto(ACC, { account_id: ACC, status: 'declined', qr: null, expires_at: null, attempt: a }, 'connecting')).toMatchObject({ status: 'failed', reason: 'declined', terminal: true });
  });

  it('Redis hết hạn → suy từ tài khoản; kênh không QR → login null; tài khoản lạ → 404', async () => {
    expect((await channelStatusOf(rig('connected').db, rig('connected').control, ACC)).login).toMatchObject({ status: 'connected', terminal: true });
    expect((await channelStatusOf(rig('connected', 'email').db, null, ACC)).login).toBeNull();
    await expect(channelStatusOf(rig().db, null, '0190f000-0000-7000-8000-0000000000ff')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('ảnh QR chỉ của attempt đang chờ; attempt cũ / đã quét → 404', async () => {
    const r = rig();
    const a1 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: null });
    const a2 = await r.control.startLogin({ ws: 'ws', account_id: ACC, user_id: null });
    await r.control.setLogin({ account_id: ACC, status: 'waiting', qr: 'PNG2', expires_at: null, attempt: a2 });
    expect(await qrImageOf(r.db, r.control, ACC, a2)).toEqual({ png_base64: 'PNG2', expires_at: null });
    await expect(qrImageOf(r.db, r.control, ACC, a1)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await r.control.setLogin({ account_id: ACC, status: 'scanned', qr: null, expires_at: null, attempt: a2 });
    await expect(qrImageOf(r.db, r.control, ACC, a2)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
