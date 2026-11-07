import { beforeEach, describe, expect, it } from 'vitest';
import { ApiRequestError } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';

describe('mock transport — envelope + policy nguồn ui', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /me trả dữ liệu prototype', async () => {
    const me = await mockTransport.get<{ user: { name: string } }>('/me');
    expect(me.user.name).toBe('Thùy Trâm');
  });

  it('list endpoint trả { data, next_cursor }', async () => {
    const res = await mockTransport.get<{ data: unknown[]; next_cursor: null }>('/notifications');
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.next_cursor).toBeNull();
  });

  it('route không tồn tại → NOT_FOUND', async () => {
    await expect(mockTransport.get('/nope')).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('action hợp lệ chạy ngay và trả action_log_id', async () => {
    const res = await mockTransport.action('notification.mark_read', { ids: 'all' });
    expect(res.status).toBe(200);
    if (res.status === 200) expect(res.data.action_log_id).toMatch(/^al_/);
    expect(mockDb().readNotifications).toBe(true);
  });

  it('input sai schema → VALIDATION_FAILED', async () => {
    const err = await mockTransport.action('workspace.switch', {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).error.code).toBe('VALIDATION_FAILED');
  });

  it('action không có trong registry → ACTION_NOT_FOUND', async () => {
    await expect(mockTransport.action('nope.do', {})).rejects.toMatchObject({ error: { code: 'ACTION_NOT_FOUND' } });
  });

  it('/me/authz đổi theo vai trò dev toolbar', async () => {
    setMockRole('accountant');
    const authz = await mockTransport.get<{ permissions: string[]; is_owner: boolean }>('/me/authz');
    expect(authz.is_owner).toBe(false);
    expect(authz.permissions).not.toContain('inbox.view');
    expect(authz.permissions).toContain('payment.record');
  });
});
