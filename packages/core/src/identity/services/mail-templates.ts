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
  transfer: {
    vi: (code: string) => ({ s: `Mã xác nhận chuyển quyền Chủ sở hữu: ${code}`, b: `Bạn đang chuyển quyền Chủ sở hữu workspace cho một thành viên khác. Mã xác nhận: <b>${code}</b> (hiệu lực 10 phút). Nếu không phải bạn, đừng nhập mã và hãy đổi mật khẩu ngay.` }),
    en: (code: string) => ({ s: `Ownership transfer code: ${code}`, b: `You are transferring workspace ownership to another member. Confirmation code: <b>${code}</b> (valid for 10 minutes). If this was not you, do not enter the code and change your password now.` }),
  },
  deleteWs: {
    vi: (code: string, ws: string) => ({ s: `Mã xác nhận XOÁ workspace: ${code}`, b: `Bạn đang yêu cầu <b>xoá vĩnh viễn</b> workspace <b>${ws}</b>. Mã xác nhận: <b>${code}</b> (hiệu lực 5 phút). Sau khi xoá, bản sao lưu được giữ 30 ngày rồi huỷ. Nếu không phải bạn, đừng nhập mã và hãy đổi mật khẩu ngay.` }),
    en: (code: string, ws: string) => ({ s: `Workspace DELETION code: ${code}`, b: `You asked to <b>permanently delete</b> the workspace <b>${ws}</b>. Confirmation code: <b>${code}</b> (valid for 5 minutes). After deletion the backup is kept for 30 days, then destroyed. If this was not you, do not enter the code and change your password now.` }),
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
export const deleteOtpMail = (to: string, locale: string, code: string, workspace: string) => msg(to, 'workspace_delete_otp', T.deleteWs[pick(locale)](code, esc(workspace)));
export const transferOtpMail = (to: string, locale: string, code: string) => msg(to, 'owner_transfer_otp', T.transfer[pick(locale)](code));
