// TIP-015f: ghép 7 port phụ thuộc vòng đời khách (thiếu port → 503 fail closed, không coi là 0 phụ thuộc; trùng port khác → lỗi boot),
// trạng thái biên nhận theo đồng hồ (tròn 30 × 24h = hết hạn; erased / restored / thiếu → chặn), quyền xoá không nhận quan hệ collaborator.
import { afterEach, describe, expect, it } from 'vitest';
import type { AuthzContext } from '@appchat/shared';
import { CONTACT_LIFECYCLE_PORTS, registerContactLifecyclePorts } from '../src/composition/contact-lifecycle.module';
import { LIFECYCLE_DOMAINS } from '../src/kernel/contact-lifecycle/ports';
import { lifecyclePorts, registerLifecyclePort, registeredLifecycleDomains, unregisterLifecyclePort } from '../src/kernel/contact-lifecycle/registry';
import { RESTORE_WINDOW_MS, receiptStatus, type LifecycleReceipt } from '../src/crm/lifecycle/receipts';
import { assertDeleteAuthority, canDeleteContact } from '../src/crm/lifecycle/authority';

afterEach(() => registerContactLifecyclePorts());

describe('registry port vòng đời khách', () => {
  it('đủ 7 domain theo thứ tự cố định; đăng ký lại cùng singleton là idempotent', () => {
    registerContactLifecyclePorts();
    registerContactLifecyclePorts();
    expect(CONTACT_LIFECYCLE_PORTS).toHaveLength(7);
    expect(registeredLifecycleDomains()).toEqual([...LIFECYCLE_DOMAINS].sort());
    expect(lifecyclePorts().map((p) => p.domain)).toEqual([...LIFECYCLE_DOMAINS]);
  });

  it('thiếu port → 503 WORKSPACE_UNAVAILABLE (fail closed)', () => {
    unregisterLifecyclePort('marketing');
    expect(() => lifecyclePorts()).toThrow(expect.objectContaining({ code: 'WORKSPACE_UNAVAILABLE', httpStatus: 503 }));
  });

  it('port khác cùng domain → lỗi boot', () => {
    expect(() => registerLifecyclePort({ domain: 'sales', dependencies: async () => [], hasRelations: async () => false })).toThrow(/đã đăng ký/);
  });
});

describe('receiptStatus', () => {
  const at = new Date('2026-11-01T00:00:00Z');
  const r = (o: Partial<LifecycleReceipt> = {}) => ({ state: 'deleted', deletedAt: at, restoreUntil: new Date(at.getTime() + RESTORE_WINDOW_MS), ...o }) as LifecycleReceipt;
  it('còn hạn / tròn 30 ngày / chặn', () => {
    expect(receiptStatus(r(), new Date(at.getTime() + RESTORE_WINDOW_MS - 1))).toBe('restorable');
    expect(receiptStatus(r(), new Date(at.getTime() + RESTORE_WINDOW_MS))).toBe('expired');
    expect(receiptStatus(r({ state: 'expired' }), at)).toBe('expired');
    for (const state of ['erased', 'restored'] as const) expect(receiptStatus(r({ state }), at)).toBe('blocked');
    expect(receiptStatus(null, at)).toBe('blocked');
  });
});

describe('quyền xoá khách', () => {
  const az = (scope: 'own' | 'team' | 'all'): AuthzContext => ({ userId: 'u1', isOwner: false, permissions: new Set(['crm.view', 'crm.delete']), scope: { crm: scope }, teamIds: ['t1'] }) as unknown as AuthzContext;
  const row = { id: 'c1', ownerUserId: 'u2', teamId: 't9' };
  it('own chỉ khách mình phụ trách; all mọi khách', () => {
    expect(canDeleteContact(az('own'), { ...row, ownerUserId: 'u1' })).toBe(true);
    expect(canDeleteContact(az('own'), row)).toBe(false);
    expect(canDeleteContact(az('all'), row)).toBe(true);
  });
  it('đọc được mà không đủ quyền → 403; không đọc được → 404', () => {
    expect(() => assertDeleteAuthority(az('own'), row, true)).toThrow(expect.objectContaining({ httpStatus: 403 }));
    expect(() => assertDeleteAuthority(az('own'), row, false)).toThrow(expect.objectContaining({ httpStatus: 404 }));
  });
});
