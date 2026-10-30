// TIP-009: route mock domain billing đúng shape đọc dùng chung với API thật (packages/shared/src/api/billing.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { billingCatalogSchema, billingSummarySchema, walletSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);

describe('mock billing — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /billing/summary', async () => {
    expect(issues(billingSummarySchema.safeParse(await mockTransport.get('/billing/summary')))).toEqual([]);
  });

  it('GET /billing/plans', async () => {
    expect(issues(billingCatalogSchema.safeParse(await mockTransport.get('/billing/plans')))).toEqual([]);
  });

  it('GET /billing/wallet', async () => {
    expect(issues(walletSchema.safeParse(await mockTransport.get('/billing/wallet')))).toEqual([]);
  });
});
