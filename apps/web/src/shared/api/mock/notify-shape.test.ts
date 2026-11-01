// TIP-006: route mock domain notify đúng shape đọc dùng chung với API thật (packages/shared/src/api/notify.ts — gap-filling §5).
import { beforeEach, describe, expect, it } from 'vitest';
import { notificationListSchema, notifyPrefsSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

describe('mock notify — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /notifications?unread=true khớp notificationListSchema', async () => {
    const res = await mockTransport.get('/notifications', { unread: true });
    expect(notificationListSchema.safeParse(res).success).toBe(true);
  });

  it('GET /settings/notifications khớp notifyPrefsSchema', async () => {
    const res = await mockTransport.get('/settings/notifications');
    const r = notifyPrefsSchema.safeParse(res);
    expect(r.success ? [] : r.error.issues).toEqual([]);
  });
});
