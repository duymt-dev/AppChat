// TIP-011: route mock phiên / onboarding / `/me` đúng shape đọc dùng chung với API thật (packages/shared/src/api/identity.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { authBrandSchema, meSchema, provisioningSchema, sessionSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);

describe('mock identity — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /session', async () => {
    expect(issues(sessionSchema.safeParse(await mockTransport.get('/session')))).toEqual([]);
  });

  it('GET /me', async () => {
    expect(issues(meSchema.safeParse(await mockTransport.get('/me')))).toEqual([]);
  });

  it('GET /auth/brand', async () => {
    expect(issues(authBrandSchema.safeParse(await mockTransport.get('/auth/brand')))).toEqual([]);
  });

  it('GET /workspace/provisioning', async () => {
    expect(issues(provisioningSchema.safeParse(await mockTransport.get('/workspace/provisioning')))).toEqual([]);
  });
});
