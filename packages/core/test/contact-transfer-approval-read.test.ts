// TIP-015d §1.3: hook duyệt theo domain — action không có hook giữ luật cũ (TRUE), có hook → vị từ của đúng action đó; không crm.reassign
// → FALSE (không cần chạm DB); kiểm input sửa: mất crm.reassign → 403 trước khi đọc khách; bulk rỗng → 422.
import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import { approvalAccess, decidableIds, registerApprovalDomain, unregisterApprovalDomain, visibleApprovalSql } from '../src/ai/approvals/domain-authorization';
import { transferApprovalHook, transferBulkApprovalHook } from '../src/crm/ownership/approval-projection';

const authz = (perms: string[]): AuthzContext => ({ userId: 'u', isOwner: false, permissions: new Set(perms), scope: { crm: 'own' }, writeScope: { crm: 'own' }, teamIds: [], teamUserIds: [] }) as never;
const members = { assertMember: async () => ({}) };
const sqlText = (s: { sql: string }) => s.sql.replace(/\s+/g, ' ');

afterEach(() => {
  unregisterApprovalDomain('contact.transfer_owner');
  unregisterApprovalDomain('contact.transfer_owner_bulk');
});

describe('domain approval hooks', () => {
  it('không hook → TRUE; có hook → loại trừ action có hook trừ khi vị từ của chính nó đúng', () => {
    expect(sqlText(visibleApprovalSql(authz([])))).toBe('TRUE');
    registerApprovalDomain('contact.transfer_owner', transferApprovalHook(members));
    const s = visibleApprovalSql(authz(['crm.reassign']));
    expect(sqlText(s)).toContain('ar.action_id <> ALL');
    expect(sqlText(s)).toContain('EXISTS (SELECT 1 FROM contact c');
    expect(s.values).toContain('contact.transfer_owner');
  });

  it('không crm.reassign → FALSE cho cả thấy lẫn quyết (đơn và hàng loạt)', () => {
    for (const h of [transferApprovalHook(members), transferBulkApprovalHook(members)]) {
      expect(sqlText(h.visible(authz(['crm.view'])))).toBe('FALSE');
      expect(sqlText(h.decidable(authz(['crm.view'])))).toBe('FALSE');
    }
  });

  it('cùng domain đăng ký lại (nhiều app trong một tiến trình) → thay; domain khác giành → lỗi boot', () => {
    registerApprovalDomain('contact.transfer_owner', transferApprovalHook(members));
    expect(() => registerApprovalDomain('contact.transfer_owner', transferApprovalHook(members))).not.toThrow();
    expect(() => registerApprovalDomain('contact.transfer_owner', { ...transferApprovalHook(members), owner: 'sales' })).toThrow(/đã đăng ký/);
  });

  it('action không hook: thấy + quyết được mà không truy vấn; decidableIds giữ id không hook', async () => {
    const tx = { $queryRaw: async () => { throw new Error('không được truy vấn'); } } as never;
    expect(await approvalAccess(tx, authz([]), 'a1', 'tag.create')).toEqual({ visible: true, decidable: true });
    expect([...(await decidableIds(tx, authz([]), [{ id: 'a1', actionId: 'tag.create' }]))]).toEqual(['a1']);
  });

  it('checkInput: mất crm.reassign → 403 trước khi đọc khách; bulk rỗng → 422', async () => {
    const tx = { contact: { findUnique: async () => { throw new Error('không được đọc'); } } } as never;
    const who = { workspaceId: 'w', authz: authz([]) };
    await expect(transferApprovalHook(members).checkInput(tx, who, { contact_id: 'c' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(transferBulkApprovalHook(members).checkInput(tx, { workspaceId: 'w', authz: authz(['crm.reassign']) }, { contact_ids: [] })).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
