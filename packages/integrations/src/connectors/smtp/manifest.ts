// SMTP — MailProvider dự phòng (nodemailer). Thẻ prototype "Google Workspace" (SMTP của Google). Thư hệ thống nền tảng: SmtpMailProvider
// (env). Kết nối của DN (TIP-012c): máy chủ + cổng 465 (TLS ngầm) / 587 (STARTTLS bắt buộc) + đăng nhập + người gửi người tích hợp xác nhận.
import type { ConnectorManifest } from '../../types';
import { mailConfigErrors } from '../../tenant-mail-validation';

export const smtpManifest: ConnectorManifest = {
  key: 'smtp',
  port: 'mail',
  name: 'Google Workspace',
  logo: 'mail',
  color: '#4285F4',
  group: 'marketing',
  status: 'ga',
  auth: {
    kind: 'basic',
    fields: [
      { key: 'host' },
      { key: 'username' },
      { key: 'password', secret: true },
      { key: 'port', optional: true },
      { key: 'sender_email', optional: true },
      { key: 'sender_name', optional: true },
      { key: 'reply_to', optional: true },
      { key: 'sender_confirmed', optional: true },
    ],
  },
  modes: ['live'],
  // Mặc định cổng 587 / người gửi = tài khoản đăng nhập khi để trống (thẻ cũ chỉ có host / username / password vẫn hợp lệ).
  validate: ({ config }) => mailConfigErrors({ ...config, port: config.port || '587', sender_email: config.sender_email || config.username || '' }, 'smtp'),
};
