// TIP-003c §2 "Reuse predecessor actions", §3.5 (AC5): hợp đồng theo ngày kết thúc / hạn link; action tiền nhiệm 036 / 038 / 039 / 042b
// giữ khoá chống lặp của domain — verifier chỉ nhận đúng actor + loại nguồn đã duyệt, gọi thẳng executor (không capability) → 403.
import { describe, expect, it, vi } from 'vitest';
import type { ActionDef } from '@appchat/actions';
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { contractTrigger, verifyContractTrigger } from '../src/contracts/system/sources';
import { domainTrigger, domainVerifier } from '../src/kernel/actions/system/domain';
import { admitInternal } from '../src/kernel/actions/system/capability';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const C = '0190f000-0000-7000-8000-00000000f001';
const conflict = { httpStatus: 409 };
const contractDb = (c: unknown) => ({ contract: { findUnique: vi.fn(async () => c) } }) as unknown as TenantDb;

describe('contract.system_transition', () => {
  it('thế hệ ngày kết thúc là chuỗi YYYY-MM-DD (Date hay chuỗi đều như nhau); gia hạn → 409', async () => {
    const a = contractTrigger(WS, 'renewal_notice', { id: C, endDate: new Date('2026-12-31T00:00:00Z') });
    const b = contractTrigger(WS, 'renewal_notice', { id: C, endDate: '2026-12-31' });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.milestone).toBe('T-30');
    await expect(verifyContractTrigger(a, contractDb({ endDate: '2027-06-30', signLinkExpiresAt: null, deletedAt: null }))).rejects.toMatchObject(conflict);
    await expect(verifyContractTrigger(a, contractDb({ endDate: new Date('2026-12-31T00:00:00Z'), signLinkExpiresAt: null, deletedAt: null }))).resolves.toBeUndefined();
  });
});

describe('action tiền nhiệm qua cổng capability', () => {
  const PRED = ['loyalty.earn', 'loyalty.reverse', 'loyalty.expire', 'loyalty.review_tier', 'follow_up.reconcile', 'digest.dispatch', 'billing.lifecycle_step', 'billing.apply_invoice', 'lead_routing.apply'];

  it('đều internal, không agentGrantable (không alias / id mới)', () => {
    for (const id of PRED) {
      const d = registry.find((a) => a.id === id) as ActionDef | undefined;
      expect(d, id).toBeDefined();
      expect([id, d!.exposure, d!.agentGrantable]).toEqual([id, 'internal', false]);
    }
  });

  it('ctx hệ thống không niêm phong (đường cũ gọi thẳng executor) → 403', () => {
    const ctx = { workspaceId: WS, source: 'system', actor: { type: 'system', id: 'loyalty' }, authz: { isOwner: true } } as never;
    expect(() => admitInternal(ctx, 'loyalty.earn', { order_id: C })).toThrow(expect.objectContaining({ httpStatus: 403 }));
  });

  it('verifier domain: sai actor / loại nguồn / thiếu nguồn → 409; cùng (actor, nguồn) → cùng hàm', async () => {
    const v = domainVerifier('loyalty', ['event', 'schedule']);
    expect(domainVerifier('loyalty', ['schedule', 'event'])).toBe(v);
    const t = domainTrigger({ workspaceId: WS, actionId: 'loyalty.expire', actor: 'loyalty', sourceKind: 'schedule', sourceRef: 'expire:x:2026-11-11T03', targetId: C, input: { contact_id: C } });
    await expect(v(t, null as never)).resolves.toBeUndefined();
    await expect(v({ ...t, actor: 'system:billing' }, null as never)).rejects.toMatchObject(conflict);
    await expect(v({ ...t, sourceKind: 'public_locator' }, null as never)).rejects.toMatchObject(conflict);
    await expect(v({ ...t, sourceRef: '' }, null as never)).rejects.toMatchObject(conflict);
  });
});
