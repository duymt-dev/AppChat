// Email hệ thống của identity theo locale người nhận (Blueprint §7.4: vi + en). Chuỗi server-side, không qua next-intl.
import type { MailMessage } from '@appchat/integrations';

type Locale = 'vi' | 'en';
const pick = (l: string): Locale => (l === 'en' ? 'en' : 'vi');
const wrap = (body: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${body}</div>`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const T = {
  otp: {
    vi: (code: string) => ({ s: `Mã xác thực AppChat: ${code}`, b: `Mã xác thực của bạn là <b>${code}</b>. Mã có hiệu lực 10 phút. Không chia sẻ mã này cho bất kỳ ai.` }),
    en: (code: string) => ({ s: `Your AppChat code: ${code}`, b: `Your verification code is <b>${code}</b>. It expires in 10 minutes. Do not share it with anyone.` }),
  },
  reset: {
    vi: (url: string) => ({ s: 'Đặt lại mật khẩu AppChat', b: `Bấm vào liên kết sau để đặt lại mật khẩu (hiệu lực 15 phút): <a href="${url}">${url}</a>. Nếu bạn không yêu cầu, hãy bỏ qua email này.` }),
    en: (url: string) => ({ s: 'Reset your AppChat password', b: `Open this link to reset your password (valid for 15 minutes): <a href="${url}">${url}</a>. If you did not request this, ignore this email.` }),
  },
  invite: {
    vi: (ws: string, url: string) => ({ s: `Lời mời tham gia ${ws} trên AppChat`, b: `Bạn được mời tham gia workspace <b>${ws}</b>. Nhận lời mời (hiệu lực 7 ngày): <a href="${url}">${url}</a>` }),
    en: (ws: string, url: string) => ({ s: `Invitation to join ${ws} on AppChat`, b: `You have been invited to the workspace <b>${ws}</b>. Accept within 7 days: <a href="${url}">${url}</a>` }),
  },
};

const msg = (to: string, tag: string, t: { s: string; b: string }): MailMessage => ({
  to,
  tag,
  subject: t.s,
  html: wrap(t.b),
  text: t.b.replace(/<[^>]+>/g, ''),
});

export const otpMail = (to: string, locale: string, code: string) => msg(to, 'otp', T.otp[pick(locale)](code));
export const resetMail = (to: string, locale: string, url: string) => msg(to, 'password_reset', T.reset[pick(locale)](esc(url)));
export const inviteMail = (to: string, locale: string, workspace: string, url: string) => msg(to, 'invite', T.invite[pick(locale)](esc(workspace), esc(url)));
