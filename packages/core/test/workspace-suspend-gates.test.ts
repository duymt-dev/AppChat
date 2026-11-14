// TIP-040 pha 4 (AC07, DC-373): cổng tạm dừng workspace ở tin gửi ra + bước AI. Tin của workspace tạm dừng được HOÃN (không gửi, không
// tính lần thử); bước AI kế tiếp của run đang chạy bị chặn. WorkspaceAccess đọc lại khi thế hệ `workspace_status` đổi.
import { describe, expect, it } from 'vitest';
import { SUSPEND_RETRY_MS, suspendHold } from '../src/channels/jobs/send.processor';
import { WorkspaceAccess } from '../src/platform/services/workspace-access';

const WS = '0190f000-0000-7000-8000-00000000cc01';

function fakeDb() {
  const st = { status: 'active', dbStatus: 'active', gen: 0n, reads: 0 };
  const db = {
    workspace: { findUnique: async () => (st.reads++, { status: st.status, dbStatus: st.dbStatus }) },
    platformConfigRevision: { findUnique: async () => ({ generation: st.gen }) },
  };
  return { st, db: db as never };
}

describe('suspendHold (gửi ra)', () => {
  it('đang mở → gửi; tạm dừng → hoãn 10 phút; không có cổng → gửi', async () => {
    const now = new Date('2026-11-07T00:00:00Z');
    expect(await suspendHold(async () => true, WS, now)).toBeNull();
    expect(await suspendHold(async () => false, WS, now)).toBe(now.getTime() + SUSPEND_RETRY_MS);
    expect(await suspendHold(undefined, WS, now)).toBeNull();
  });
});

describe('WorkspaceAccess', () => {
  it('cache theo thế hệ: tạm dừng (thế hệ tăng) → thấy đóng sau ≤ 2 giây; mở lại → thấy mở', async () => {
    let t = 0;
    const { st, db } = fakeDb();
    const a = new WorkspaceAccess(db, () => t);
    expect(await a.isOpen(WS)).toBe(true);
    st.status = 'suspended';
    st.dbStatus = 'suspended';
    st.gen = 1n;
    t += 500;
    expect(await a.isOpen(WS)).toBe(true);
    t += 2_000;
    expect(await a.isOpen(WS)).toBe(false);
    await expect(a.assertOpen(WS)).rejects.toMatchObject({ httpStatus: 423, code: 'WORKSPACE_UNAVAILABLE' });
    st.status = 'active';
    st.dbStatus = 'active';
    st.gen = 2n;
    t += 2_100;
    expect(await a.isOpen(WS)).toBe(true);
  });

  it('db_status khác active (lưu trữ…) cũng là đóng', async () => {
    const { st, db } = fakeDb();
    st.dbStatus = 'archiving';
    expect(await new WorkspaceAccess(db).isOpen(WS)).toBe(false);
  });
});
