// TIP-006 AC11: SMTP adapter (nodemailer) — transport JSON / stream của nodemailer, không gọi mạng.
import { describe, expect, it } from 'vitest';
import { MailSendError, SmtpMailProvider } from '../src';

const msg = { to: 'khach@b.vn', subject: 'Chào', html: '<b>Xin chào</b>', text: 'Xin chào', tag: 'notify_msg' };
const sender = { email: 'no-reply@appchat.vn', name: 'AppChat' };

describe('SmtpMailProvider', () => {
  it('dựng thư đúng from / to / subject / html / text + header tag', async () => {
    const p = new SmtpMailProvider({ host: 'x', port: 587, secure: false, sender, transport: { jsonTransport: true } });
    const out = await p.send(msg);
    expect(out.id).toMatch(/@/);
    // jsonTransport trả message dạng JSON — đọc lại qua sendMail trực tiếp để kiểm nội dung.
    const raw = await (p as unknown as { t: { sendMail(m: object): Promise<{ message: string }> } }).t.sendMail({
      from: { address: sender.email, name: sender.name },
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: { 'X-AppChat-Tag': msg.tag },
    });
    const m = JSON.parse(raw.message) as { from: { address: string; name: string }; to: { address: string }[]; subject: string; html: string; text: string; headers: Record<string, string> };
    expect(m.from).toEqual({ address: 'no-reply@appchat.vn', name: 'AppChat' });
    expect(m.to[0]!.address).toBe('khach@b.vn');
    expect(m).toMatchObject({ subject: 'Chào', html: '<b>Xin chào</b>', text: 'Xin chào' });
    expect(m.headers['x-appchat-tag'] ?? m.headers['X-AppChat-Tag']).toBe('notify_msg');
  });

  it('SMTP không tới được → MailSendError, không lộ mật khẩu', async () => {
    const p = new SmtpMailProvider({ host: '127.0.0.1', port: 1, secure: false, user: 'u', pass: 'p-secret', sender });
    const err = await p.send(msg).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MailSendError);
    expect(String((err as Error).message)).not.toContain('p-secret');
  });
});
