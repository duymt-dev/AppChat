import { describe, expect, it } from 'vitest';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

describe('mock auth + onboarding', () => {
  it('OTP đăng ký → phiên mới chưa khai báo, trial 15 ngày', async () => {
    await mockTransport.post('/auth/otp/request', { email: 'a@b.vn', purpose: 'register' });
    const r = await mockTransport.post<{ needs_declare: boolean }>('/auth/otp/verify', { email: 'a@b.vn', code: '246810', purpose: 'register' });
    expect(r.needs_declare).toBe(true);
    expect(mockDb().session).toMatchObject({ authed: true, declared: false, trialDaysLeft: 15 });
  });

  it('mã OTP sai định dạng → VALIDATION_FAILED', async () => {
    await expect(mockTransport.post('/auth/otp/verify', { email: 'a@b.vn', code: '12a' })).rejects.toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    });
  });

  it('tra MST: 10 / 13 số trả dữ liệu, sai định dạng → NOT_FOUND', async () => {
    const hit = await mockTransport.get<{ legal_name: string }>('/business-lookup/tax/0312%20345%20678');
    expect(hit.legal_name).toContain('MEDIASOFT');
    await expect(mockTransport.get('/business-lookup/tax/123')).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('business_profile.update: cá nhân bắt buộc VNeID 12 số; xong → declared, chờ khởi tạo', async () => {
    const bad = mockTransport.action('business_profile.update', { kind: 'individual', legal_name: 'A', address: 'B', business_description: 'Spa' });
    await expect(bad).rejects.toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
    const ok = await mockTransport.action('business_profile.update', {
      kind: 'enterprise',
      tax_code: '0312345678',
      legal_name: 'CÔNG TY A',
      address: 'HCM',
      business_description: 'Spa',
    });
    expect(ok.status).toBe(200);
    expect(mockDb().session).toMatchObject({ declared: true, provisioned: false });
    expect((await mockTransport.get<{ status: string }>('/workspace/provisioning')).status).toBe('running');
    expect((await mockTransport.get<{ status: string }>('/workspace/provisioning')).status).toBe('ready');
  });

  it('ack chào mừng trial + đăng xuất', async () => {
    await mockTransport.post('/session/ack', { notice: 'trial_welcome' });
    expect(mockDb().session.trialSeen).toBe(true);
    await mockTransport.post('/auth/logout');
    expect(mockDb().session.authed).toBe(false);
  });
});
