// TIP-032d §1.3–1.5, §2.4 (thuần, không DB): giành tệp một-chủ (claimFile: chèn được → tạo; trùng đúng cha → claim cũ; cha khác → 409 không
// lộ cha kia), registry nguồn tệp trung lập (claimedFileAccess: chưa giành → null để route giữ luật cũ; adapter quyết khi đã giành; loại cha
// chưa đăng ký → từ chối), tệp riêng tư không qua link ký (đã giành HOẶC đang staging). Lõi liên kết: staging chỉ gắn được khi đúng người
// tải / đúng cha / đã hợp lệ cấu trúc với validator hiện hành + digest khớp; thiếu bundle → 503; revision lệch → 409.
import { describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../src/kernel/actions/action-context';
import { claimFile, claimedFileAccess, isPrivateRecordFile, registerRecordFileSource } from '../src/kernel/files/file-claims';
import { VALIDATOR_VERSION } from '../src/kernel/files/attachment-validation';
import { lockSet, stagedFor } from '../src/sales/files/association';

const F = '0193a000-0000-7000-8000-0000000000f1';
const P = '0193a000-0000-7000-8000-0000000000a1';
const Q = '0193a000-0000-7000-8000-0000000000a2';
const U = '0193a000-0000-7000-8000-0000000000b1';
const authz = { isOwner: false, userId: U, permissions: new Set(['order.view']) } as unknown as AuthzContext;
type Err = { status?: number; code?: string; fields?: unknown };
type Thrown = { httpStatus?: number; code?: string; fields?: unknown };
const err = (p: Promise<unknown>): Promise<Err | null> => p.then(() => null, (e: Thrown) => ({ status: e.httpStatus, code: e.code, fields: e.fields }));

type Claim = { fileId: string; parentType: string; parentId: string; associationId: string } | null;
const claimTx = (inserted: number, cur: Claim) => ({ $executeRaw: async () => inserted, fileClaim: { findUnique: async () => cur } }) as unknown as TenantTx;

describe('claimFile — một tệp một cha', () => {
  const c = { fileId: F, parentType: 'order', parentId: P, associationId: 'a1', revision: 1, now: new Date() };
  it('chèn được → tạo mới', async () => {
    expect(await claimFile(claimTx(1, null), c)).toEqual({ associationId: 'a1', created: true });
  });
  it('đã giành cho đúng cha → trả claim cũ (gửi lại không tạo thêm)', async () => {
    expect(await claimFile(claimTx(0, { fileId: F, parentType: 'order', parentId: P, associationId: 'a0' }), c)).toEqual({ associationId: 'a0', created: false });
  });
  it('đã giành cho cha khác (kể cả khác loại) → 409 file: claimed, không lộ cha kia', async () => {
    const want = { status: 409, code: 'CONFLICT', fields: { file: 'claimed' } };
    expect(await err(claimFile(claimTx(0, { fileId: F, parentType: 'order', parentId: Q, associationId: 'a0' }), c))).toEqual(want);
    expect(await err(claimFile(claimTx(0, { fileId: F, parentType: 'invoice', parentId: P, associationId: 'a0' }), c))).toEqual(want);
  });
});

describe('claimedFileAccess — registry nguồn trung lập', () => {
  const tx = (cur: Claim) => ({ fileClaim: { findUnique: async () => cur } }) as unknown as TenantTx;
  it('tệp chưa thuộc bản ghi → null (route giữ luật cũ)', async () => {
    expect(await claimedFileAccess(tx(null), authz, F)).toBeNull();
  });
  it('loại cha chưa đăng ký adapter → false (đóng an toàn)', async () => {
    expect(await claimedFileAccess(tx({ fileId: F, parentType: 'unit_test_parent', parentId: P, associationId: 'a' }), authz, F)).toBe(false);
  });
  it('đã giành → adapter quyết theo quyền cha hiện hành (người tải không là đường tắt)', async () => {
    const seen: string[] = [];
    registerRecordFileSource({
      parentType: 'unit_test_record',
      canRead: async (_t, a, pid, fid) => {
        seen.push(`${a.userId}:${pid}:${fid}`);
        return pid === P;
      },
      holds: async () => true,
    });
    expect(await claimedFileAccess(tx({ fileId: F, parentType: 'unit_test_record', parentId: P, associationId: 'a' }), authz, F)).toBe(true);
    expect(await claimedFileAccess(tx({ fileId: F, parentType: 'unit_test_record', parentId: Q, associationId: 'a' }), authz, F)).toBe(false);
    expect(seen).toEqual([`${U}:${P}:${F}`, `${U}:${Q}:${F}`]);
  });
});

describe('isPrivateRecordFile — link ký công khai từ chối tệp bản ghi', () => {
  const tx = (claimed: boolean, staged: boolean) =>
    ({ fileClaim: { findUnique: async () => (claimed ? { fileId: F } : null) }, attachmentStaging: { findUnique: async () => (staged ? { fileId: F } : null) } }) as unknown as TenantTx;
  it.each([
    [true, false, true],
    [false, true, true],
    [false, false, false],
  ])('đã giành=%s staging=%s → riêng tư=%s', async (c, s, want) => {
    expect(await isPrivateRecordFile(tx(c, s), F)).toBe(want);
  });
});

describe('stagedFor — điều kiện gắn staging', () => {
  const good = { fileId: F, uploadedBy: U, parentType: 'order', parentId: P, status: 'structurally_valid', validatorVersion: VALIDATOR_VERSION, digest: 'd1', reason: null };
  const okFile = { id: F, sha256: 'd1', purpose: 'record_attachment' };
  const tx = (s: Record<string, unknown> | null, file: Record<string, unknown> | null = okFile) =>
    ({ attachmentStaging: { findUnique: async () => s }, file: { findUnique: async () => file } }) as unknown as TenantTx;
  type Over = Partial<{ userId: string; type: 'order' | 'invoice'; parentId: string }>;
  const call = (t: TenantTx, o: Over = {}) => err(stagedFor(t, { fileId: F, userId: U, type: 'order', parentId: P, ...o }));
  const v422 = (reason: string) => ({ status: 422, code: 'VALIDATION_FAILED', fields: { file_id: reason } });
  const other = { status: 409, code: 'CONFLICT', fields: { file_id: 'other_target' } };

  it('đủ điều kiện → trả staging', async () => {
    expect(await stagedFor(tx(good), { fileId: F, userId: U, type: 'order', parentId: P })).toMatchObject({ fileId: F });
  });
  it.each<[string, TenantTx, Over, Err]>([
    ['không có staging', tx(null), {}, v422('not_found')],
    ['người khác tải', tx(good), { userId: Q }, v422('not_found')],
    ['tải cho cha khác', tx(good), { parentId: Q }, other],
    ['tải cho loại cha khác', tx(good), { type: 'invoice' }, other],
    ['thiếu bundle cô lập', tx({ ...good, status: 'unavailable' }), {}, { status: 503, code: 'VALIDATION_ISOLATION_UNAVAILABLE', fields: { file_id: 'validation_unavailable' } }],
    ['bị từ chối kèm lý do', tx({ ...good, status: 'rejected', reason: 'macro' }), {}, v422('macro')],
    ['chưa kiểm', tx({ ...good, status: 'pending' }), {}, v422('not_validated')],
    ['validator cũ', tx({ ...good, validatorVersion: VALIDATOR_VERSION - 1 }), {}, v422('not_validated')],
    ['digest lệch (tệp bị thay)', tx(good, { ...okFile, sha256: 'khac' }), {}, v422('not_validated')],
    ['purpose khác', tx(good, { ...okFile, purpose: 'attachment' }), {}, v422('not_validated')],
  ])('%s', async (_n, t, o, want) => {
    expect(await call(t, o)).toEqual(want);
  });
});

describe('lockSet — revision bộ tệp', () => {
  const tx = (rev: number) => ({ $executeRaw: async () => 1, $queryRaw: async () => [{ revision: rev }] }) as unknown as TenantTx;
  it('khớp → trả revision; lệch → 409 STALE; null (gửi lại / gỡ) → bỏ qua so', async () => {
    expect(await lockSet(tx(3), 'order', P, 3)).toBe(3);
    expect(await err(lockSet(tx(3), 'order', P, 2))).toEqual({ status: 409, code: 'STALE_VERSION', fields: { if_revision: 'changed' } });
    expect(await lockSet(tx(3), 'invoice', P, null)).toBe(3);
  });
});
