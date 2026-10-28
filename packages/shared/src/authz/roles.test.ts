import { describe, expect, it } from 'vitest';
import { can } from './permissions';
import { authzForRole } from './roles';

describe('authz roles (Blueprint §3.5)', () => {
  it('owner has every permission', () => {
    const ctx = authzForRole('owner', 'u1');
    expect(can(ctx, 'billing.manage')).toBe(true);
    expect(can(ctx, 'ai.governance')).toBe(true);
  });

  it('manager lacks owner-only and delegated permissions', () => {
    const ctx = authzForRole('manager', 'u1');
    expect(can(ctx, 'quote.approve')).toBe(true);
    expect(can(ctx, 'billing.manage')).toBe(false);
    expect(can(ctx, 'contract.sign')).toBe(false);
    expect(can(ctx, 'roles.manage')).toBe(false);
  });

  it('sales cannot approve quotes and is scoped to own', () => {
    const ctx = authzForRole('sales', 'u1');
    expect(can(ctx, 'quote.send')).toBe(true);
    expect(can(ctx, 'quote.approve')).toBe(false);
    expect(ctx.scope.crm).toBe('own');
  });

  it('cs reads all contacts but has no sales scope', () => {
    const ctx = authzForRole('cs', 'u1');
    expect(ctx.scope.crm).toBe('all');
    expect(ctx.scope.sales).toBe('none');
    expect(can(ctx, 'catalog.cost_view')).toBe(false);
  });

  it('accountant has no inbox access', () => {
    const ctx = authzForRole('accountant', 'u1');
    expect(can(ctx, 'inbox.view')).toBe(false);
    expect(can(ctx, 'payment.record')).toBe(true);
  });
});
