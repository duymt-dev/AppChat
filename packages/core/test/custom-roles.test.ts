// TIP-042 (unit, DB giả) — vai trò tuỳ biến: bản nháp kiểm đủ (không lặng lọc), hệ thống bất biến, CAS version, tombstone không cấp quyền,
// gán vai trò không vượt quyền người gán (DC-298), resolver khoá cache theo `authz_revision` (đọc lại ngay khi revision đổi, Redis lỗi → DB).
import { describe, expect, it } from 'vitest';
import { AppError, ROLE_DEFS, authzForRole, type AuthzContext } from '@appchat/shared';
import { assertRoleDraft, liveRole, lockCustomRole } from '../src/authz/services/role-lifecycle';
import { assertAssignable } from '../src/authz/services/role-assignment';
import { AuthzResolver } from '../src/authz/services/authz-resolver';
import { LEGACY_DELEGATIONS_BOOT_ID } from '../src/authz/jobs/authz.jobs.module';

const KEY = 'custom:0190f000-0000-7000-8000-000000000042';
const FULL = { inbox: 'own', crm: 'all', sales: 'none', booking: 'own', support: 'own', insights: 'own' };
type Row = { key: string; name: string; isSystem: boolean; permissions: string[]; dataScope: unknown; version: number; deletedAt: Date | null; createdAt: Date; id: string };
const role = (o: Partial<Row> = {}): Row => ({ id: 'r1', key: KEY, name: 'Lễ tân', isSystem: false, permissions: ['inbox.view', 'crm.view'], dataScope: FULL, version: 2, deletedAt: null, createdAt: new Date(0), ...o });

function db(rows: Row[]) {
  return {
    role: { findUnique: async ({ where }: { where: { key: string } }) => rows.find((r) => r.key === where.key) ?? null, findUniqueOrThrow: async ({ where }: { where: { key: string } }) => rows.find((r) => r.key === where.key)! },
    $queryRaw: async (_s: TemplateStringsArray, key: string) => rows.filter((r) => r.key === key && !r.deletedAt).map((r) => ({ id: r.id })),
  };
}
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: AppError) => `${e.httpStatus} ${JSON.stringify(e.fields)}`);

describe('vai trò tuỳ biến — vòng đời', () => {
  it('bản nháp: quyền riêng Chủ sở hữu / quyền lạ / thiếu module → 422 nêu đúng chỗ; hợp lệ → đủ sáu module, không trùng', () => {
    expect(() => assertRoleDraft(['billing.manage', 'x.y'], FULL)).toThrow(expect.objectContaining({ fields: { 'permissions.billing.manage': 'owner_only', 'permissions.x.y': 'unknown' } }));
    expect(() => assertRoleDraft([], { inbox: 'all' })).toThrow(AppError);
    const ok = assertRoleDraft(['inbox.view', 'inbox.view', 'contract.sign'], FULL);
    expect(ok.permissions).toEqual(['inbox.view', 'contract.sign']);
    expect(Object.keys(ok.scope)).toHaveLength(6);
  });

  it('khoá để sửa: hệ thống 422 · lạ 404 · tombstone 404 · lệch version 409', async () => {
    const d = db([role(), role({ key: 'custom:0190f000-0000-7000-8000-0000000000dd', id: 'r2', deletedAt: new Date() })]) as never;
    expect(await code(lockCustomRole(d, 'manager'))).toBe('422 {"role_key":"system_role"}');
    expect(await code(lockCustomRole(d, 'custom:0190f000-0000-7000-8000-0000000000ff'))).toBe('404 {"role_key":"not_found"}');
    expect(await code(lockCustomRole(d, 'custom:0190f000-0000-7000-8000-0000000000dd'))).toBe('404 {"role_key":"not_found"}');
    expect(await code(lockCustomRole(d, KEY, 1))).toBe('409 {"version":"2"}');
    expect((await lockCustomRole(d, KEY, 2)).key).toBe(KEY);
  });

  it('liveRole: hệ thống từ code; tombstone / dòng is_system giả mạo key custom → null (fail closed)', async () => {
    expect((await liveRole(db([]) as never, 'sales'))?.permissions).toEqual([...ROLE_DEFS.sales.permissions]);
    expect(await liveRole(db([role({ deletedAt: new Date() })]) as never, KEY)).toBeNull();
    expect(await liveRole(db([role({ isSystem: true })]) as never, KEY)).toBeNull();
    expect(await liveRole(db([]) as never, 'sales_vip')).toBeNull();
  });
});

describe('gán vai trò (DC-298) — không vượt quyền người gán', () => {
  const mgr: AuthzContext = authzForRole('manager', 'u-mgr');
  it('Quản lý gán vai trò có contract.sign (mình không có) → 403; vai trò ⊆ quyền mình → được; Chủ sở hữu luôn được', async () => {
    const strong = db([role({ permissions: ['inbox.view', 'contract.sign'] })]) as never;
    expect(await code(assertAssignable(strong, mgr, KEY))).toBe('403 {"role":"escalation","permissions":"contract.sign"}');
    expect(await code(assertAssignable(db([role()]) as never, mgr, KEY))).toBe('ok');
    expect(await code(assertAssignable(strong, authzForRole('owner', 'o'), KEY))).toBe('ok');
  });

  it('Sales (phạm vi own) gán vai trò phạm vi crm all → 403 data_scope; owner / tombstone → 422', async () => {
    const sales = { ...authzForRole('sales', 'u-s'), permissions: new Set([...ROLE_DEFS.sales.permissions]) } as AuthzContext;
    expect(await code(assertAssignable(db([role()]) as never, sales, KEY))).toBe('403 {"role":"escalation","data_scope":"crm"}');
    expect(await code(assertAssignable(db([]) as never, mgr, 'owner'))).toBe('422 {"role":"owner"}');
    expect(await code(assertAssignable(db([role({ deletedAt: new Date() })]) as never, mgr, KEY))).toBe('422 {"role":"not_found"}');
  });
});

describe('resolver — revision tenant', () => {
  function stack(o: { rev: bigint | null; redisDown?: boolean }) {
    const st = { rev: o.rev, perms: ['inbox.view'], deleted: null as Date | null };
    const store = new Map<string, string>();
    const cache = {
      get: async (k: string) => (o.redisDown ? Promise.reject(new Error('down')) : (store.get(k) ?? null)),
      set: async (k: string, v: string) => (o.redisDown ? Promise.reject(new Error('down')) : void store.set(k, v)),
      incr: async () => 1,
    };
    const tenant = {
      authzRevision: { findUnique: async () => (st.rev === null ? null : { revision: st.rev }) },
      teamMember: { findMany: async () => [] },
      role: { findUnique: async () => ({ permissions: st.perms, dataScope: FULL, deletedAt: st.deleted, isSystem: false }) },
    };
    const platform = {
      workspace: { findUnique: async () => ({ ownerUserId: 'owner', authzEpoch: 1 }) },
      membership: { findMany: async () => [] },
    };
    const r = new AuthzResolver(platform as never, { get: async () => tenant } as never, cache);
    return { r, st };
  }
  const M = { roleKey: KEY, delegations: [] };

  it('cache theo revision: không đổi → không đọc lại; sửa vai trò tăng revision → lần kế tiếp thấy quyền mới', async () => {
    const { r, st } = stack({ rev: 5n });
    expect([...(await r.resolve('ws', 'u', M)).permissions]).toEqual(['inbox.view']);
    await r.resolve('ws', 'u', M);
    expect(r.loads).toBe(1);
    st.perms = ['inbox.view', 'crm.view'];
    st.rev = 6n;
    expect([...(await r.resolve('ws', 'u', M)).permissions]).toEqual(['inbox.view', 'crm.view']);
    expect(r.loads).toBe(2);
  });

  it('xoá mềm → không quyền; thiếu bảng revision (schema cũ) → không cache; Redis lỗi → đọc DB, không lỗi', async () => {
    const a = stack({ rev: 1n });
    a.st.deleted = new Date();
    expect((await a.r.resolve('ws', 'u', M)).permissions.size).toBe(0);
    const b = stack({ rev: null });
    await b.r.resolve('ws', 'u', M);
    await b.r.resolve('ws', 'u', M);
    expect(b.r.loads).toBe(2);
    const c = stack({ rev: 1n, redisDown: true });
    expect([...(await c.r.resolve('ws', 'u', M)).permissions]).toEqual(['inbox.view']);
  });
});

describe('job chuyển uỷ quyền P0', () => {
  it('id job khởi động hợp lệ với BullMQ (không chứa ":" — từng làm worker dừng khi boot)', () => {
    expect(LEGACY_DELEGATIONS_BOOT_ID).not.toContain(':');
  });
});
