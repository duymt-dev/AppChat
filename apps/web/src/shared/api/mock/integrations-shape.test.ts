// TIP-012: route mock Nền tảng kết nối đúng shape đọc dùng chung với API thật (packages/shared/src/api/integrations.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { connectorListSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

describe('mock integrations — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /settings/integrations', async () => {
    const r = connectorListSchema.safeParse(await mockTransport.get('/settings/integrations'));
    expect(r.success ? [] : r.error.issues).toEqual([]);
  });
});
