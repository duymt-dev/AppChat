// TIP-015c pha 5 (unit, native fixture — không Postgres thật): 041 restore gate đối chiếu journal nền tảng đã acknowledged với DB tenant
// vừa khôi phục (packages/core/src/kernel/privacy/restore-gate.ts). Không PII trong capsule — chỉ kiểm tính đầy đủ (mọi operationId đã
// acknowledged phải có mặt trong privacy_operation vừa khôi phục); thiếu một revision → chặn mở (503 fail closed), không mở nửa vời.
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { encryptSecret } from '../src/kernel/crypto';
import { assertRestoreCurrent, verifyRestoreAgainstJournal, type RestoreGateQuery } from '../src/kernel/privacy/restore-gate';

const KEY = randomBytes(32);
const OTHER_KEY = randomBytes(32);
const WS = '0190f000-0000-7000-8000-00000000c015';

interface Capsule {
  canonicalContactId: string;
  familyGeneration: number;
  familyIds: string[];
  requesterId: string;
}

const capsule = (c: Capsule, key: Buffer) => {
  const blob = encryptSecret(JSON.stringify(c), key);
  return { keyVersion: blob[0]!, capsuleIv: blob.subarray(1, 13).toString('base64'), capsuleCipher: blob.subarray(13).toString('base64') };
};

/** Journal giả: `entries` acknowledged sẵn — findMany trả đúng field gate cần, lọc theo workspaceId + acknowledgedAt not null. */
function fakePlatform(entries: { workspaceId: string; operationId: string; sequence: bigint; revision: number; acknowledgedAt: Date | null; capsule: ReturnType<typeof capsule> }[]) {
  return {
    privacyJournalEntry: {
      findMany: async ({ where }: { where: { workspaceId: string; acknowledgedAt: { not: null } } }) =>
        entries
          .filter((e) => e.workspaceId === where.workspaceId && e.acknowledgedAt !== null)
          .sort((a, b) => Number(a.sequence - b.sequence))
          .map((e) => ({ operationId: e.operationId, sequence: e.sequence, revision: e.revision, ...e.capsule })),
    },
  };
}

/** DB tenant vừa khôi phục — `present` là tập operationId còn thấy trong privacy_operation. */
const fakeQuery = (present: readonly string[]): RestoreGateQuery => async (sql, params) => {
  expect(sql).toContain('privacy_operation');
  const ids = (params![0] as string[]) ?? [];
  return ids.filter((id) => present.includes(id)).map((id) => ({ id })) as never;
};

const OP1 = '0190f000-0000-7000-8000-0000000000a1';
const OP2 = '0190f000-0000-7000-8000-0000000000a2';
const CONTACT = '0190f000-0000-7000-8000-0000000000c1';
const now = new Date('2026-11-10T00:00:00Z');

describe('verifyRestoreAgainstJournal', () => {
  it('không có revision nào đã acknowledged (workspace chưa từng "Quên khách") → bỏ qua, không cần khoá', async () => {
    const platform = fakePlatform([]);
    const r = await verifyRestoreAgainstJournal(platform as never, null, fakeQuery([]), WS);
    expect(r).toEqual({ checkedEntries: 0, stale: [] });
  });

  it('DB vừa khôi phục đã có đủ operation của mọi revision đã acknowledged → không stale', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    const r = await verifyRestoreAgainstJournal(platform as never, KEY, fakeQuery([OP1]), WS);
    expect(r).toEqual({ checkedEntries: 1, stale: [] });
  });

  it('DB vừa khôi phục là bản lưu trữ CŨ (thiếu operation của revision đã acknowledged sau đó) → stale, giải mã đúng capsule', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
      { workspaceId: WS, operationId: OP2, sequence: 2n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: 'c2', familyGeneration: 1, familyIds: ['c2'], requesterId: 'u2' }, KEY) },
    ]);
    // Bản lưu trữ chỉ có OP1 (được tạo trước lượt forget thứ 2) — OP2 không có trong DB vừa khôi phục.
    const r = await verifyRestoreAgainstJournal(platform as never, KEY, fakeQuery([OP1]), WS);
    expect(r.checkedEntries).toBe(2);
    expect(r.stale).toHaveLength(1);
    expect(r.stale[0]).toMatchObject({ operationId: OP2, revision: 1, sequence: '2' });
    expect(r.stale[0]!.capsule).toMatchObject({ canonicalContactId: 'c2', requesterId: 'u2' });
  });

  it('có revision cần kiểm nhưng thiếu khoá (APP_ENC_KEY) → 503 fail closed, không coi "không giải mã được" là an toàn', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    await expect(verifyRestoreAgainstJournal(platform as never, null, fakeQuery([OP1]), WS)).rejects.toMatchObject({ code: 'WORKSPACE_UNAVAILABLE', httpStatus: 503, fields: { privacy_journal: 'missing_key' } });
  });

  it('chỉ kiểm revision của ĐÚNG workspace — journal workspace khác không ảnh hưởng', async () => {
    const otherWs = '0190f000-0000-7000-8000-00000000c099';
    const platform = fakePlatform([
      { workspaceId: otherWs, operationId: OP2, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: 'c9', familyGeneration: 1, familyIds: ['c9'], requesterId: 'u9' }, KEY) },
    ]);
    const r = await verifyRestoreAgainstJournal(platform as never, KEY, fakeQuery([]), WS);
    expect(r).toEqual({ checkedEntries: 0, stale: [] });
  });

  it('khoá sai (xoay khoá, bản chưa đúng key hiện hành) → ném lỗi giải mã, không trả stale rỗng giả', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    await expect(verifyRestoreAgainstJournal(platform as never, OTHER_KEY, fakeQuery([]), WS)).rejects.toThrow();
  });
});

describe('assertRestoreCurrent — gọi ở runRestore() trước khi workspace chuyển active', () => {
  it('đủ mọi revision → trả kết quả, không ném', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    await expect(assertRestoreCurrent(platform as never, KEY, fakeQuery([OP1]), WS)).resolves.toMatchObject({ checkedEntries: 1, stale: [] });
  });

  it('thiếu operation của một revision đã acknowledged → 503, workspace KHÔNG được chuyển active', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: now, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    await expect(assertRestoreCurrent(platform as never, KEY, fakeQuery([]), WS)).rejects.toMatchObject({ code: 'WORKSPACE_UNAVAILABLE', httpStatus: 503, fields: { privacy_journal: 'stale_restore', missing_operations: '1' } });
  });

  it('revision chưa acknowledged (reserve lúc preparing, chưa commit tenant) không chặn restore — chỉ kiểm revision đã chắc chắn durable', async () => {
    const platform = fakePlatform([
      { workspaceId: WS, operationId: OP1, sequence: 1n, revision: 1, acknowledgedAt: null, capsule: capsule({ canonicalContactId: CONTACT, familyGeneration: 1, familyIds: [CONTACT], requesterId: 'u1' }, KEY) },
    ]);
    await expect(assertRestoreCurrent(platform as never, KEY, fakeQuery([]), WS)).resolves.toMatchObject({ checkedEntries: 0, stale: [] });
  });
});
