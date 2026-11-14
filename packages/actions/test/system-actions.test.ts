// TIP-003c §1.1: action riêng — `exposure: 'internal'` không thể agentGrantable (define ném), không lọt bề mặt cấp quyền agent; các id
// hệ thống hiện có (bank ingress, privacy cleanup, ký phụ lục công khai) mang exposure internal (không alias).
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineAction, isAgentGrantable, isInternalAction, registry } from '../src';

const base = { module: 'sales', description: 'x', input: z.object({}), output: z.object({}), permission: 'self', risk: 'write' } as const;

describe('action riêng (exposure internal)', () => {
  it('internal + agentGrantable → defineAction ném; mặc định là public', () => {
    expect(() => defineAction({ ...base, id: 'x.internal_grant', exposure: 'internal', agentGrantable: true } as never)).toThrow(/internal/);
    const pub = defineAction({ ...base, id: 'x.public' } as never);
    expect(isInternalAction(pub)).toBe(false);
  });

  it('các id hệ thống hiện có mang exposure internal', () => {
    for (const id of ['bank_feed.ingest', 'privacy.cleanup_step', 'contract.appendix_public_otp', 'contract.appendix_public_sign', 'contract.appendix_public_decline']) {
      const a = registry.find((d) => d.id === id);
      expect(a, id).toBeDefined();
      expect(isInternalAction(a!), id).toBe(true);
    }
  });

  it('không action internal nào cấp được cho agent', () => {
    const internal = registry.filter(isInternalAction);
    expect(internal.length).toBeGreaterThanOrEqual(5);
    for (const a of internal) {
      expect(a.agentGrantable, a.id).toBeFalsy();
      expect(isAgentGrantable(a), a.id).toBe(false);
    }
  });
});
