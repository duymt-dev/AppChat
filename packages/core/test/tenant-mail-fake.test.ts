// TIP-012c P6: transport Brevo giả của stack ai:live (TENANT_MAIL_TRANSPORT=fake) — không mạng; người gửi cố định đã kích hoạt; khoá
// `bad` → 401, khoá `unknown` → 503 (kết quả unknown ở adapter); cấm ở production (ném khi dựng transport).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAKE_SENDER, mailTransports } from '../src/integrations/mail/module';

afterEach(() => vi.unstubAllEnvs());

describe('TENANT_MAIL_TRANSPORT=fake', () => {
  it('dev / test: người gửi cố định, gửi 201 + messageId, khoá unknown 503, khoá bad 401', async () => {
    vi.stubEnv('TENANT_MAIL_TRANSPORT', 'fake');
    vi.stubEnv('NODE_ENV', 'test');
    const { http } = mailTransports();
    const get = await http({ method: 'GET', url: 'https://api.brevo.com/v3/senders', headers: { 'api-key': 'xkeysib-ok' } });
    expect(JSON.parse(get.body).senders).toEqual([{ id: 1, email: FAKE_SENDER, name: 'AI Live', active: true }]);
    const sent = await http({ method: 'POST', url: 'https://api.brevo.com/v3/smtp/email', headers: { 'api-key': 'xkeysib-ok' }, body: '{}' });
    expect(sent.status).toBe(201);
    expect(JSON.parse(sent.body).messageId).toMatch(/^<fake-.+@smtp-relay\.mailin\.fr>$/);
    expect((await http({ method: 'POST', url: 'https://api.brevo.com/v3/smtp/email', headers: { 'api-key': 'xkeysib-unknown' }, body: '{}' })).status).toBe(503);
    expect((await http({ method: 'GET', url: 'https://api.brevo.com/v3/senders', headers: { 'api-key': 'xkeysib-bad' } })).status).toBe(401);
  });

  it('production → ném khi dựng; không đặt biến → transport thật (không phải giả)', () => {
    vi.stubEnv('TENANT_MAIL_TRANSPORT', 'fake');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => mailTransports()).toThrow(/cấm ở production/);
    vi.stubEnv('TENANT_MAIL_TRANSPORT', '');
    expect(() => mailTransports()).not.toThrow();
  });
});
