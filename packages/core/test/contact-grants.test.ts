// TIP-042c (unit): quan hệ khách (collaborator / watcher) — chế độ cho phép, SQL EXISTS theo chế độ, guard 404 / 403 không lộ tồn tại.
import { describe, expect, it } from 'vitest';
import { TenantSql as Prisma } from '@appchat/db';
import { authzForRole, type AuthzContext } from '@appchat/shared';
import { POLICIES, grantAllows, grantOf, grantSql, grantsFor, guardRecord } from '../src/authz/data-access';

const ME = '0190f000-0000-7000-8000-00000000aa01';
const OTHER = '0190f000-0000-7000-8000-00000000aa02';
const K = '0190f000-0000-7000-8000-00000000cc01';

type Row = { contactId: string; userId: string; role: 'collaborator' | 'watcher' };
const fakeTx = (rows: Row[]) => {
  let calls = 0;
  return {
    calls: () => calls,
    contactCollaborator: {
      findUnique: async ({ where }: { where: { contactId_userId: { contactId: string; userId: string } } }) => {
        calls++;
        const r = rows.find((x) => x.contactId === where.contactId_userId.contactId && x.userId === where.contactId_userId.userId);
        return r ? { role: r.role } : null;
      },
      findMany: async ({ where }: { where: { contactId: string; userId: { in: string[] } } }) => {
        calls++;
        return rows.filter((x) => x.contactId === where.contactId && where.userId.in.includes(x.userId));
      },
    },
  } as never as Parameters<typeof grantOf>[0] & { calls: () => number };
};

const sales: AuthzContext = { ...authzForRole('sales', ME), teamIds: [] };

describe('grantAllows', () => {
  it('collaborator đọc + ghi; watcher chỉ đọc; không có → không', () => {
    expect([grantAllows('collaborator', 'read'), grantAllows('collaborator', 'write')]).toEqual([true, true]);
    expect([grantAllows('watcher', 'read'), grantAllows('watcher', 'write')]).toEqual([true, false]);
    expect([grantAllows(null, 'read'), grantAllows(undefined, 'write')]).toEqual([false, false]);
  });
});

describe('grantOf / grantsFor', () => {
  it('đọc quan hệ một người / nhiều người một truy vấn; khách null → không truy vấn', async () => {
    const tx = fakeTx([{ contactId: K, userId: ME, role: 'watcher' }, { contactId: K, userId: OTHER, role: 'collaborator' }]);
    expect(await grantOf(tx, K, ME)).toBe('watcher');
    expect(await grantOf(tx, null, ME)).toBeNull();
    const m = await grantsFor(tx, K, [ME, OTHER, 'x']);
    expect(Object.fromEntries(m)).toEqual({ [ME]: 'watcher', [OTHER]: 'collaborator' });
    expect(tx.calls()).toBe(2);
    expect((await grantsFor(tx, K, [])).size).toBe(0);
  });
});

describe('grantSql', () => {
  it('đọc: mọi quan hệ; ghi: chỉ collaborator; cột khách do server truyền', () => {
    const r = grantSql(ME, Prisma.raw('q.contact_id'), 'read');
    expect(r.sql).toContain('cc.contact_id = q.contact_id');
    expect(r.sql).not.toContain('cc.role');
    expect(r.values).toEqual([ME]);
    expect(grantSql(ME, Prisma.raw('q.contact_id'), 'write').sql).toContain("cc.role = 'collaborator'");
  });
});

describe('guardRecord', () => {
  const ref = { owner: OTHER, contact: K };
  const NF = { order_id: 'not_found' };
  it('watcher: đọc qua, ghi → 403 SCOPE_FORBIDDEN', async () => {
    const tx = fakeTx([{ contactId: K, userId: ME, role: 'watcher' }]);
    await expect(guardRecord(tx, sales, POLICIES.sales, 'read', ref, NF)).resolves.toBeUndefined();
    await expect(guardRecord(tx, sales, POLICIES.sales, 'write', ref, NF)).rejects.toMatchObject({ code: 'SCOPE_FORBIDDEN', httpStatus: 403 });
  });

  it('không quan hệ → 404 cả đọc lẫn ghi (không lộ tồn tại qua 403)', async () => {
    const tx = fakeTx([]);
    await expect(guardRecord(tx, sales, POLICIES.sales, 'read', ref, NF)).rejects.toMatchObject({ code: 'NOT_FOUND', fields: NF });
    await expect(guardRecord(tx, sales, POLICIES.sales, 'write', ref, NF)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('collaborator ghi được; scope none chặn cả collaborator (404)', async () => {
    const tx = fakeTx([{ contactId: K, userId: ME, role: 'collaborator' }]);
    await expect(guardRecord(tx, sales, POLICIES.sales, 'write', ref, NF)).resolves.toBeUndefined();
    const none = { ...sales, scope: { ...sales.scope, sales: 'none' as const } };
    await expect(guardRecord(tx, none, POLICIES.sales, 'read', { owner: ME, contact: K }, NF)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
