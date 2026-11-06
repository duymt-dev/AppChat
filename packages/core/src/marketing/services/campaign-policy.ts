// Luật thuần của chiến dịch (TIP-037, REQ-I02–I04, DC-240 / DC-246): biến nội dung (allowlist), chia A/B tất định, băm nội dung / snapshot,
// kiểm nội dung theo kênh (độ dài sau khi render, email cần tiêu đề), giờ hẹn (ISO có múi giờ, tương lai theo Clock server), nút hợp lệ,
// số đo từ bằng chứng. Không I/O — dùng chung handler, worker và test.
import { createHash } from 'node:crypto';
import { AppError, CAMPAIGN_DELETABLE, CAMPAIGN_EDITABLE, CAMPAIGN_FLOW, allowedActions as flowActions, type CampaignChannel, type CampaignStatusKey } from '@appchat/shared';

/** Biến cho phép trong nội dung — chỉ dữ liệu khách mà chiến dịch được dùng (tên, mã khách, hạng thành viên). */
export const CONTENT_VARS = ['ten', 'ma_khach', 'hang'] as const;
export type ContentVar = (typeof CONTENT_VARS)[number];
export type VarValues = Partial<Record<ContentVar, string | null>>;

/** Giá trị thay thế khi khách thiếu dữ liệu — hiện rõ ở xem trước, không để `{ten}` lọt ra khách. */
export const VAR_FALLBACK: Record<ContentVar, string> = { ten: 'Quý khách', ma_khach: '', hang: '' };

const VAR_RE = /\{([a-z_]+)\}/g;

/** Độ dài tối đa của một tin theo kênh (manifest — Zalo 2000; email rộng). Không cắt / chẻ ngầm. */
export const CHANNEL_MAX_TEXT: Record<CampaignChannel, number> = { zalo: 2000, email: 100_000 };
/** Chỗ dành cho dòng huỷ nhận tin nối cuối tin (link ký). */
export const UNSUB_FOOTER_RESERVE = 220;

export function unknownVariables(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(VAR_RE)) if (!(CONTENT_VARS as readonly string[]).includes(m[1]!)) out.add(m[1]!);
  return [...out];
}

export function renderContent(text: string, v: VarValues): string {
  return text.replace(VAR_RE, (all, k: string) => ((CONTENT_VARS as readonly string[]).includes(k) ? (v[k as ContentVar]?.trim() || VAR_FALLBACK[k as ContentVar]) : all));
}

export interface CampaignContent {
  text: string;
  subject?: string;
  cta?: string;
}

/** Nội dung hợp lệ cho kênh — lỗi gom theo ô (422). `maxLen` = độ dài tin dài nhất có thể sau khi thay biến. */
export function contentErrors(channel: CampaignChannel, c: CampaignContent, ab: { text_b: string } | null): Record<string, string> {
  const e: Record<string, string> = {};
  for (const [field, t] of [['content.text', c.text], ['ab.text_b', ab?.text_b ?? null]] as const) {
    if (t === null) continue;
    if (!t.trim()) e[field] = 'required';
    else if (unknownVariables(t).length) e[field] = `unknown_variable:${unknownVariables(t).join(',')}`;
    else if (worstLength(t) + UNSUB_FOOTER_RESERVE > CHANNEL_MAX_TEXT[channel]) e[field] = `too_long:${CHANNEL_MAX_TEXT[channel] - UNSUB_FOOTER_RESERVE}`;
  }
  if (channel === 'email' && !c.subject?.trim()) e['content.subject'] = 'required';
  if (c.subject && unknownVariables(c.subject).length) e['content.subject'] = 'unknown_variable';
  return e;
}

/** Độ dài xấu nhất: mỗi biến tính 60 ký tự (tên / mã / hạng dài nhất hợp lệ). */
const worstLength = (t: string) => t.replace(VAR_RE, 'x'.repeat(60)).length;

export function assertContent(channel: CampaignChannel, c: CampaignContent, ab: { text_b: string } | null): void {
  const e = contentErrors(channel, c, ab);
  if (Object.keys(e).length) throw new AppError('VALIDATION_FAILED', 422, e);
}

/** Chia A/B 50/50 tất định theo (chiến dịch, khách) — cùng công thức với SQL snapshot (md5 → 32 bit → chẵn / lẻ). */
export function variantOf(campaignId: string, contactId: string): 'a' | 'b' {
  const h = createHash('md5').update(campaignId + contactId).digest('hex').slice(0, 8);
  return (parseInt(h, 16) & 1) === 1 ? 'b' : 'a';
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Băm phần được duyệt: nội dung + A/B + tài khoản gửi + kênh + giờ hẹn. Đổi bất kỳ phần nào → bản duyệt không còn khớp. */
export function contentHash(x: { channel: string; content: unknown; ab: unknown; accountId: string | null; scheduledAt: Date | null }): string {
  return sha(JSON.stringify([x.channel, x.content, x.ab ?? null, x.accountId, x.scheduledAt?.toISOString() ?? null]));
}

/** Giờ hẹn: ISO 8601 CÓ múi giờ (không đoán theo giờ máy), sau `now` ít nhất 1 phút. */
export function parseSchedule(s: string, now: Date): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) throw new AppError('VALIDATION_FAILED', 422, { scheduled_at: 'iso_offset' });
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new AppError('VALIDATION_FAILED', 422, { scheduled_at: 'invalid' });
  if (d.getTime() < now.getTime() + 60_000) throw new AppError('VALIDATION_FAILED', 422, { scheduled_at: 'past' });
  return d;
}

/** Nút người dùng bấm được ở trạng thái hiện tại (FE `allowed[]`) — theo CAMPAIGN_FLOW, thêm gửi thử / xoá / xuất / gửi lại. */
export function allowedActions(status: CampaignStatusKey): string[] {
  const ids = flowActions(CAMPAIGN_FLOW, status).filter((a) => !a.includes(':') && !SYSTEM_EDGES.has(a));
  if (CAMPAIGN_EDITABLE.includes(status)) ids.push('campaign.send_test');
  if (CAMPAIGN_DELETABLE.includes(status)) ids.push('campaign.delete');
  if (['running', 'paused', 'completed', 'cancelled'].includes(status)) ids.push('campaign.recipient_export', 'campaign.resend_unread');
  return [...new Set(ids)];
}

/** Cạnh chỉ hệ thống đi (scheduler / worker) — không phải nút. */
const SYSTEM_EDGES = new Set(['campaign.schedule', 'campaign.start', 'campaign.complete']);

export interface RecipientCounts {
  total: number;
  pending: number;
  skipped: number;
  sent: number;
  failed: number;
  unknown: number;
  replied: number;
  converted: number;
  read: number;
  revenue: bigint;
}

export const emptyCounts = (): RecipientCounts => ({ total: 0, pending: 0, skipped: 0, sent: 0, failed: 0, unknown: 0, replied: 0, converted: 0, read: 0, revenue: 0n });

/**
 * Số đo từ bằng chứng (DC-240): mẫu số = người nhận hợp lệ (snapshot trừ bị loại); `sent` = kênh đã nhận (gồm đã trả lời / chuyển đổi);
 * đọc / click chỉ khi kênh có biên nhận — không thì null (không phải 0 đo được).
 */
export function statsOf(n: RecipientCounts, caps: { read_receipt: boolean; click: boolean }) {
  const eligible = n.total - n.skipped;
  const done = n.total - n.pending + n.unknown;
  return {
    eligible,
    sent: n.sent + n.replied + n.converted,
    skipped: n.skipped,
    failed: n.failed,
    unknown: n.unknown,
    replied: n.replied + n.converted,
    converted: n.converted,
    open: caps.read_receipt ? n.read : null,
    click: caps.click ? 0 : null,
    progress: n.total ? Math.min(100, Math.round((done * 100) / n.total)) : 0,
    revenue: n.revenue.toString(),
  };
}

/** Kênh có xác nhận đọc / click không (theo adapter hiện có — không tự nhận). */
export const CHANNEL_CAPS: Record<CampaignChannel, { read_receipt: boolean; click: boolean }> = {
  zalo: { read_receipt: false, click: false },
  email: { read_receipt: false, click: false },
};
