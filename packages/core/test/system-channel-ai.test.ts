// TIP-003c §4.5–4.6 (AC6): đăng nhập trễ / hạ tài khoản theo thế hệ phiên / công bố kho theo lần nạp hiện hành. Verifier đọc nguồn đã
// lưu (fake db) — thế hệ đổi → 409; effect đọc lại dưới khoá — ứng viên cũ / phiên cũ → no_effect, không ghi.
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { loginTrigger, unavailableTrigger, verifyChannelTrigger } from '../src/channels/system/sources';
import { commitLogin, markUnavailable } from '../src/channels/system/effects';
import { kbPublishTrigger, verifyKbPublish } from '../src/ai/kb/system/sources';
import { publishSource } from '../src/ai/kb/system/effects';
import { takeCandidate, withCandidate } from '../src/ai/kb/system/candidates';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const ACC = '0190f000-0000-7000-8000-00000000ac01';
const SRC = '0190f000-0000-7000-8000-00000000bb01';
const now = new Date('2026-11-11T03:00:00Z');
const conflict = { httpStatus: 409 };

const chDb = (row: { sessionGeneration: number } | null) => ({ channelAccount: { findUnique: vi.fn(async () => row) } }) as unknown as TenantDb;
const kbDb = (row: { ingestSeq: number; learn: boolean } | null) => ({ kbSource: { findUnique: vi.fn(async () => row) } }) as unknown as TenantDb;

describe('channel.system_transition — trigger + verifier', () => {
  it('trigger tất định theo (tài khoản, lần đăng nhập) / (tài khoản, thế hệ phiên)', () => {
    expect(loginTrigger(WS, ACC, 'a1').input).toEqual(loginTrigger(WS, ACC, 'a1').input);
    expect(loginTrigger(WS, ACC, 'a1').idempotencyKey).not.toBe(loginTrigger(WS, ACC, 'a2').idempotencyKey);
    expect(unavailableTrigger(WS, ACC, 'expired', 3).sourceRef).toBe('session:3');
    expect(unavailableTrigger(WS, ACC, 'expired', 3).idempotencyKey).not.toBe(unavailableTrigger(WS, ACC, 'expired', 4).idempotencyKey);
  });

  it('phiên đã sang thế hệ mới → 409 (lỗi trễ của phiên cũ không hạ kết nối mới)', async () => {
    await expect(verifyChannelTrigger(unavailableTrigger(WS, ACC, 'expired', 3), chDb({ sessionGeneration: 4 }))).rejects.toMatchObject(conflict);
    await expect(verifyChannelTrigger(unavailableTrigger(WS, ACC, 'send_errors', 4), chDb({ sessionGeneration: 4 }))).resolves.toBeUndefined();
  });

  it('input bị sửa (entity / trigger_id) hoặc tài khoản không còn → 409 / 404', async () => {
    const t = loginTrigger(WS, ACC, 'a1');
    await expect(verifyChannelTrigger({ ...t, input: { ...t.input, operation: 'mark_expired' } }, chDb({ sessionGeneration: 1 }))).rejects.toMatchObject(conflict);
    await expect(verifyChannelTrigger(t, chDb(null))).rejects.toMatchObject({ httpStatus: 404 });
  });
});

function chTx(cur: Record<string, unknown> | null, dup: { id: string } | null = null) {
  return {
    $queryRaw: vi.fn(async () => []),
    channelAccount: { findUnique: vi.fn(async () => cur), findFirst: vi.fn(async () => dup), update: vi.fn(async () => cur) },
  };
}
const accounts = { setStatus: vi.fn(async (_tx: unknown, row: Record<string, unknown>, patch: Record<string, unknown>) => ({ row: { ...row, ...patch }, event: { topic: 'channel.status_changed', payload: {} } })) };
const staged = { externalId: 'zalo-1', name: 'Spa An', credentialsEnc: Buffer.from('enc').toString('base64') };

describe('channel.system_transition — effect', () => {
  it('commit_login_result: tài khoản không còn connecting (người dùng đã ngắt) → no_effect, không ghi', async () => {
    const tx = chTx({ id: ACC, type: 'zalo_personal', status: 'disconnected', name: 'x', externalId: null });
    const e = await commitLogin(tx as never, accounts as never, ACC, staged, now);
    expect(e.out).toMatchObject({ disposition: 'no_effect', reason_code: 'not_connecting' });
    expect(tx.channelAccount.update).not.toHaveBeenCalled();
  });

  it('commit_login_result: trùng Zalo đang dùng ở tài khoản khác → no_effect duplicate; thiếu kết quả stage → result_missing', async () => {
    const tx = chTx({ id: ACC, type: 'zalo_personal', status: 'connecting', name: 'x', externalId: null }, { id: 'other' });
    expect((await commitLogin(tx as never, accounts as never, ACC, staged, now)).out.reason_code).toBe('duplicate');
    expect((await commitLogin(tx as never, accounts as never, ACC, null, now)).out.reason_code).toBe('result_missing');
    expect(tx.channelAccount.update).not.toHaveBeenCalled();
  });

  it('commit_login_result: connecting → connected + channel.connected + route sau commit', async () => {
    const tx = chTx({ id: ACC, type: 'zalo_personal', status: 'connecting', name: 'Nhãn riêng', externalId: null });
    const e = await commitLogin(tx as never, accounts as never, ACC, staged, now);
    expect(e.out.disposition).toBe('applied');
    expect(e.events.map((x) => x.topic)).toContain('channel.connected');
    expect(e.route?.status).toBe('connected');
    // Nhãn người dùng đặt giữ nguyên; credential chỉ đi qua tham chiếu đã mã hoá.
    expect((tx.channelAccount.update.mock.calls as unknown as [Record<string, unknown>][])[0]![0]).not.toHaveProperty('data.name');
  });

  it('mark_*: thế hệ phiên đã đổi trong transaction → no_effect stale_generation', async () => {
    const tx = chTx({ id: ACC, status: 'connected', sessionGeneration: 5, pausedAt: null });
    accounts.setStatus.mockClear();
    const e = await markUnavailable(tx as never, accounts as never, ACC, 'expired', 4, undefined, now);
    expect(e.out.reason_code).toBe('stale_generation');
    expect(accounts.setStatus).not.toHaveBeenCalled();
  });
});

describe('kb.system_publish', () => {
  it('verifier: học lại (ingest_seq tăng) → 409; learn đổi khác loại công bố → 409', async () => {
    await expect(verifyKbPublish(kbPublishTrigger(WS, 'publish_ready', SRC, 2), kbDb({ ingestSeq: 3, learn: true }))).rejects.toMatchObject(conflict);
    await expect(verifyKbPublish(kbPublishTrigger(WS, 'publish_ready', SRC, 3), kbDb({ ingestSeq: 3, learn: false }))).rejects.toMatchObject({ httpStatus: 409, fields: { trigger: 'learn_changed' } });
    await expect(verifyKbPublish(kbPublishTrigger(WS, 'publish_unlearned', SRC, 3), kbDb({ ingestSeq: 3, learn: false }))).resolves.toBeUndefined();
  });

  it('ứng viên chỉ sống trong lời gọi, lấy một lần; thiếu / sai loại → no_effect', async () => {
    const seen = await withCandidate(WS, SRC, 3, { kind: 'unlearned' }, async () => [takeCandidate(WS, SRC, '3'), takeCandidate(WS, SRC, '3')]);
    expect(seen).toEqual([{ kind: 'unlearned' }, null]);
    expect(takeCandidate(WS, SRC, '3')).toBeNull();
    const tx = { $queryRaw: vi.fn(), kbSource: { findUnique: vi.fn() } };
    expect((await publishSource(tx as never, SRC, 'publish_ready', 3, { kind: 'failed', error: 'x' }, now)).out.reason_code).toBe('candidate_missing');
    expect(tx.kbSource.findUnique).not.toHaveBeenCalled();
  });

  it('nguồn đã xoá / đã sang lần nạp khác dưới khoá → no_effect, không thay đoạn', async () => {
    const tx = (s: Record<string, unknown>) => ({ $queryRaw: vi.fn(async () => []), $executeRaw: vi.fn(), kbSource: { findUnique: vi.fn(async () => s), update: vi.fn() }, kbChunk: { deleteMany: vi.fn() } });
    const c = { kind: 'ready' as const, model: 'm', space: 'p:m:1536:', chunks: [{ content: 'a', tokens: 1, meta: {}, vector: [0.1] }] };
    const del = tx({ deletedAt: now, ingestSeq: 3, status: 'processing' });
    expect((await publishSource(del as never, SRC, 'publish_ready', 3, c, now)).out.reason_code).toBe('deleted');
    const sup = tx({ deletedAt: null, ingestSeq: 4, status: 'pending' });
    expect((await publishSource(sup as never, SRC, 'publish_ready', 3, c, now)).out.reason_code).toBe('superseded');
    expect(sup.kbChunk.deleteMany).not.toHaveBeenCalled();
    const ok = tx({ deletedAt: null, ingestSeq: 3, status: 'processing', createdBy: null });
    const e = await publishSource(ok as never, SRC, 'publish_ready', 3, c, now);
    expect(e).toMatchObject({ out: { disposition: 'applied' }, events: [{ topic: 'kb.source_ready', payload: { chunk_count: 1 } }] });
    expect(ok.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
