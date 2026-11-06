// Nội dung email tóm tắt (TIP-038 pha 4, DC-366): chỉ số liệu người nhận được xem (đã lọc theo quyền + scope ở digest.service), escape HTML
// mọi chuỗi động, vi / en theo locale người nhận, link tuyệt đối vào app (yêu cầu đăng nhập — không link tải / token). Không LLM.
import { interpolate, serverMessages, type DashboardDto, type WorkItemDto } from '@appchat/shared';
import type { MailMessage } from '@appchat/integrations';
import type { Cadence } from './digest-period';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const DIGEST_WORK_LINES = 8;

export interface DigestContent {
  to: string;
  locale: string;
  workspace: string;
  cadence: Cadence;
  period: string;
  work: WorkItemDto[];
  followUps: number;
  ai: DashboardDto['ai_today'];
  publicUrl: string;
}

export function digestMail(c: DigestContent): MailMessage {
  const m = serverMessages(c.locale).insights.digest;
  const base = c.publicUrl.replace(/\/$/, '');
  const vars = { workspace: c.workspace, period: c.period };
  const shown = c.work.slice(0, DIGEST_WORK_LINES);
  const lines = shown.map((w) => ({ text: `${w.title} — ${w.sub}`, url: `${base}${w.route}` }));
  const more = c.work.length - shown.length;
  const ai = interpolate(m.ai, { runs: c.ai.runs, actions: c.ai.actions, handoffs: c.ai.handoffs });
  const follow = interpolate(m.follow, { n: c.followUps });
  const footer = interpolate(m.footer, { cadence: m.cadence[c.cadence] });
  const intro = interpolate(m.intro[c.cadence], vars);
  const html = [
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">',
    `<p>${esc(intro)}</p>`,
    `<p><b>${esc(m.work)}</b></p>`,
    lines.length
      ? `<ul>${lines.map((l) => `<li><a href="${esc(l.url)}">${esc(l.text)}</a></li>`).join('')}</ul>`
      : `<p>${esc(m.noWork)}</p>`,
    more > 0 ? `<p>${esc(interpolate(m.more, { n: more }))}</p>` : '',
    `<p>${esc(follow)}<br>${esc(ai)}</p>`,
    `<p><a href="${esc(`${base}/dashboard`)}">${esc(m.open)}</a></p>`,
    `<p style="color:#6B7280;font-size:12px">${esc(footer)}</p>`,
    '</div>',
  ].join('');
  const text = [
    intro,
    '',
    m.work,
    ...(lines.length ? lines.map((l) => `- ${l.text}: ${l.url}`) : [m.noWork]),
    ...(more > 0 ? [interpolate(m.more, { n: more })] : []),
    '',
    follow,
    ai,
    '',
    `${m.open}: ${base}/dashboard`,
    '',
    footer,
  ].join('\n');
  return {
    to: c.to,
    tag: `digest_${c.cadence}`,
    subject: interpolate(m.subject[c.cadence], vars),
    html,
    text,
  };
}
