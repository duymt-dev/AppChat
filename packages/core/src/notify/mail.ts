// Email thông báo theo locale người nhận (i18n §8): chữ ở packages/shared/src/i18n/server, link tuyệt đối theo APP_PUBLIC_URL.
import { NOTIFY_KINDS, interpolate, serverMessages, type NotifyKind } from '@appchat/shared';
import type { MailMessage } from '@appchat/integrations';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Mẫu tiêu đề: `params.variant` chọn biến thể của loại (vd. crm_access approved / rejected), thiếu → `title`. */
function titleTemplate(kind: NotifyKind, locale: string, params: Record<string, string | number>): string {
  const k = serverMessages(locale).notify.kind[kind] as { title: string } & Record<string, string>;
  const v = typeof params.variant === 'string' && params.variant !== 'label' ? k[params.variant] : undefined;
  return v ?? k.title;
}

export function notificationTitle(kind: NotifyKind, locale: string, params: Record<string, string | number>): string {
  return interpolate(titleTemplate(kind, locale, params), params);
}

export function notificationMail(i: {
  to: string;
  locale: string;
  kind: NotifyKind;
  params: Record<string, string | number>;
  workspace: string;
  link?: string | null;
  publicUrl: string;
}): MailMessage {
  const m = serverMessages(i.locale).notify;
  const title = notificationTitle(i.kind, i.locale, i.params);
  const titleHtml = interpolate(titleTemplate(i.kind, i.locale, i.params), i.params, esc);
  const url = `${i.publicUrl.replace(/\/$/, '')}${i.link ?? '/dashboard'}`;
  const footer = interpolate(m.mail.footer, { label: m.kind[i.kind].label });
  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">',
    `<p><b>${titleHtml}</b></p>`,
    `<p><a href="${esc(url)}">${esc(m.mail.open)}</a></p>`,
    `<p style="color:#6B7280;font-size:12px">${esc(footer)}</p>`,
    '</div>',
  ].join('');
  return {
    to: i.to,
    tag: `notify_${NOTIFY_KINDS[i.kind].group}`,
    subject: interpolate(m.mail.subject, { workspace: i.workspace, title }),
    html,
    text: `${title}\n\n${m.mail.open}: ${url}\n\n${footer}`,
  };
}
