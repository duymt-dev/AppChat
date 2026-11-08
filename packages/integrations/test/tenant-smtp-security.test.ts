// TIP-012c §1.4 (AC2): ma trận an toàn đích SMTP — host IP / localhost / nội bộ, DNS trả private / trộn / metadata / IPv4 nhúng IPv6,
// cổng 25 / tuỳ ý → từ chối TRƯỚC khi mở kết nối; 465 / 587 → TLS bắt buộc, ghim IP + servername gốc, không tắt kiểm chứng chỉ. Transport giả.
import { describe, expect, it, vi } from 'vitest';
import { isPublicAddress, resolveSmtpTarget, smtpTransportOptions, tenantSmtpFactory, type ConnectionCtx, type SmtpTransportLike } from '../src';

const pub = async () => ['203.113.1.10'];
const conn = (host: string, port = '587'): ConnectionCtx => ({ id: 'c', mode: 'live', config: { host, port, username: 'u' }, secrets: { password: 'p' } });

describe('đích SMTP', () => {
  it.each([
    ['10.0.0.5', '587', 'host'],
    ['localhost', '587', 'host'],
    ['mail.internal', '587', 'host'],
    ['smtp.spahoa.vn', '25', 'port'],
    ['smtp.spahoa.vn', '2525', 'port'],
  ])('%s:%s → %s', async (h, p, reason) => {
    await expect(resolveSmtpTarget(h, p, pub)).rejects.toMatchObject({ reason });
  });
  it.each([[['127.0.0.1']], [['10.1.2.3']], [['169.254.169.254']], [['203.113.1.10', '192.168.1.2']], [['::1']], [['::ffff:10.0.0.1']], [['fd00::1']], [['0.0.0.0']], [['224.0.0.1']]])('DNS %j → private_address', async (ips) => {
    await expect(resolveSmtpTarget('smtp.spahoa.vn', '587', async () => ips)).rejects.toMatchObject({ reason: 'private_address' });
  });
  it('DNS lỗi / rỗng → dns', async () => {
    await expect(resolveSmtpTarget('smtp.spahoa.vn', '587', async () => [])).rejects.toMatchObject({ reason: 'dns' });
    await expect(resolveSmtpTarget('smtp.spahoa.vn', '587', async () => Promise.reject(new Error('ENOTFOUND')))).rejects.toMatchObject({ reason: 'dns' });
  });
  it('465 TLS ngầm / 587 STARTTLS bắt buộc; ghim IP, servername gốc, kiểm chứng chỉ', async () => {
    const t465 = smtpTransportOptions(await resolveSmtpTarget('SMTP.SpaHoa.vn.', '465', pub), { user: 'u', pass: 'p' });
    expect(t465).toMatchObject({ host: '203.113.1.10', port: 465, secure: true, requireTLS: false, tls: { servername: 'smtp.spahoa.vn', rejectUnauthorized: true } });
    const t587 = smtpTransportOptions(await resolveSmtpTarget('smtp.spahoa.vn', '587', pub), { user: 'u', pass: 'p' });
    expect(t587).toMatchObject({ port: 587, secure: false, requireTLS: true, ignoreTLS: false });
    expect(isPublicAddress('2001:4860:4860::8888')).toBe(true);
  });
});

describe('transport tenant', () => {
  const fake = (o: Partial<SmtpTransportLike> = {}) => {
    const t = { verify: vi.fn(async () => true), sendMail: vi.fn(async () => ({ accepted: ['k@x.vn'], rejected: [], response: '250 OK', messageId: '<m@a>' })), close: vi.fn(), ...o };
    return t as SmtpTransportLike & { sendMail: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  };
  it('đích private → không tạo transport (không mở mạng), lỗi đã làm sạch', async () => {
    const create = vi.fn();
    await expect(tenantSmtpFactory(async () => ['10.0.0.9'], create)(conn('smtp.spahoa.vn'))).rejects.toMatchObject({ code: 'unsupported', field: 'private_address' });
    expect(create).not.toHaveBeenCalled();
  });
  it('mỗi lần mở phân giải lại; đăng nhập sai → auth_failed không lộ mật khẩu; gửi xong đóng', async () => {
    const resolve = vi.fn(pub);
    const t = fake();
    const make = tenantSmtpFactory(resolve, () => t);
    const send = await make(conn('smtp.spahoa.vn'));
    await send({ from: { address: 'a@b.vn', name: 'A' }, to: 'k@x.vn', subject: 's', html: 'h', text: 't', messageId: '<m@a>', headers: {} });
    expect(t.sendMail.mock.calls[0]![0]).toMatchObject({ disableFileAccess: true, disableUrlAccess: true });
    expect(t.close).toHaveBeenCalled();
    await make(conn('smtp.spahoa.vn'));
    expect(resolve).toHaveBeenCalledTimes(2);
    const bad = fake({ verify: vi.fn(async () => Promise.reject(Object.assign(new Error('Invalid login: p'), { code: 'EAUTH' }))) });
    const err = await tenantSmtpFactory(pub, () => bad)(conn('smtp.spahoa.vn')).catch((e: Error) => e);
    expect(err).toMatchObject({ code: 'auth_failed' });
    expect(String((err as Error).message)).not.toContain('p ');
  });
});
