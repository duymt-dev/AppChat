// Mock action phụ của Marketing (TIP-037): phân khúc (segment.*), gửi thử cho chính người bấm, gửi lại người chưa có bằng chứng đọc (tạo
// NHÁP mới), nhập danh sách (lô id khách), xuất người nhận (CSV có BOM), AI phân tích (trả run_id — trạng thái ở /campaign-analyses/:id)
// và viết lại nội dung theo giọng. Trang huỷ nhận tin công khai: GET /public/campaign-unsubscribe/:token (+ POST …/confirm).
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { mockMailSenders } from './tenant-mail';
import { importTexts } from './product-import';
import { CUSTOMERS, MOCK_UUID, NOW, SEGMENTS } from './marketing-seed';

const find = (db: MockDb, id: string) => {
  const c = db.marketing.campaigns.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};
const fail = (field: string, reason: string) => new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: reason, fields: { [field]: reason } });
const VARS = ['ten', 'ma_khach', 'hang'];
const unknownVars = (t: string) => [...t.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!).filter((v) => !VARS.includes(v));

/** Đọc CSV mẫu (tên, SĐT, email): khớp khách theo SĐT / email, sai định dạng → lỗi theo dòng; trùng → bỏ qua. */
function parseImport(fileId: string) {
  const text = importTexts.get(fileId)?.text ?? '';
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(1);
  if (!lines.length) throw fail('file_id', 'no_contact_column');
  const seen = new Set<string>();
  const ids: string[] = [];
  const errors: { row: number; reason: string }[] = [];
  let duplicate = 0;
  lines.forEach((l, i) => {
    const [, phone = '', email = ''] = l.split(',').map((x) => x.trim());
    const key = (phone || email).toLowerCase();
    if (!/^\+?[\d ]{9,15}$/.test(phone) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return void errors.push({ row: i + 2, reason: 'invalid_contact' });
    if (seen.has(key)) return void duplicate++;
    seen.add(key);
    const hit = CUSTOMERS.find((c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '') || c.email === email);
    ids.push(hit?.id ?? MOCK_UUID(ids.length + 1, 9700));
  });
  return { rows: lines.length, ids, errors, duplicate };
}

const csvCell = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""');

export const marketingExtraHandlers: Record<string, MockHandler> = {
  'segment.preview': {
    execute: (db, i: { segment_ids?: string[]; contact_ids?: string[] }) => {
      const count = (i.segment_ids ?? []).reduce((s, id) => s + (SEGMENTS.find((x) => x.id === id)?.last_count ?? 0), 0) + (i.contact_ids?.length ?? 0);
      return { count, reachable: Math.round(count * 0.94) };
    },
  },
  'segment.create': {
    execute: (_db, i: { name: string; filter: (typeof SEGMENTS)[number]['filter'] }) => {
      const s = { key: `custom_${SEGMENTS.length}`, id: MOCK_UUID(SEGMENTS.length + 1, 9200), name: i.name, filter: i.filter, is_dynamic: true, last_count: 0, version: 1, updated_at: NOW };
      SEGMENTS.push(s);
      return { segment_id: s.id, count: 0, version: 1 };
    },
  },
  'campaign.send_test': {
    execute: (db, i: { campaign_id: string }) => {
      const c = find(db, i.campaign_id);
      c.history.push(['test_sent', 'Trâm', NOW]);
      return { sent_to: 'tram@appchat.vn' };
    },
  },
  'campaign.resend_unread': {
    execute: (db, i: { campaign_id: string }) => {
      const src = find(db, i.campaign_id);
      const ids = src.recipients.filter((r) => r.outcome === 'accepted' && !r.replied_at && !r.read_at).map((r) => r.contact_id);
      if (!ids.length) throw fail('audience', 'empty');
      const n = ++db.marketing.seq;
      db.marketing.campaigns.unshift({
        ...src,
        id: `cp_${n}`,
        code: `CD-${n}`,
        name: `${src.name} · gửi lại`,
        status: 'draft',
        version: 1,
        est_recipients: ids.length,
        approved_by: null,
        approved_at: null,
        stats: { ...src.stats, eligible: 0, sent: 0, skipped: 0, failed: 0, unknown: 0, replied: 0, converted: 0, progress: 0, revenue: '0' },
        history: [['created', 'Trâm', NOW]],
        recipients: [],
        suggestion_id: null,
      });
      return { campaign_id: `cp_${n}`, code: `CD-${n}`, est_recipients: ids.length, read_evidence: src.capabilities.read_receipt };
    },
  },
  'campaign.audience_import': {
    execute: (db, i: { file_id: string; dry_run?: boolean }) => {
      const r = parseImport(i.file_id);
      const batch = i.dry_run ? null : MOCK_UUID(Object.keys(db.marketing.batches).length + 1, 9800);
      if (batch) db.marketing.batches[batch] = r.ids;
      return { batch_id: batch, rows: r.rows, valid: r.ids.length, invalid: r.errors.length, duplicate: r.duplicate, opted_out: 0, created: 0, errors: r.errors };
    },
  },
  'campaign.recipient_export': {
    execute: (db, i: { campaign_id: string; status?: string }) => {
      const c = find(db, i.campaign_id);
      const rows = c.recipients.filter((r) => !i.status || r.status === i.status);
      const csv = `﻿"Khách","Liên hệ","Trạng thái","Gửi lúc"\n${rows.map((r) => [r.name, r.endpoint, r.status, r.sent_at ?? ''].map((v) => `"${csvCell(v)}"`).join(',')).join('\n')}`;
      const id = MOCK_UUID(rows.length, 9900);
      exportBlobs.set(`/files/${id}`, csv);
      return { file_id: id, rows: rows.length, url: `/v1/files/${id}` };
    },
  },
  // TIP-012c: người gửi suy từ thẻ connector Brevo / SMTP của mock (tenant-mail.ts).
  'campaign.mail_senders': { execute: (db) => ({ senders: mockMailSenders(db) }) },
  'campaign.get': {
    execute: (db, i: { campaign_id: string }) => {
      const c = db.marketing.campaigns.find((x) => !x.deleted && (x.id === i.campaign_id || x.code === i.campaign_id || x.name === i.campaign_id));
      if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.campaign_id });
      const delivery: Record<string, number> = {};
      for (const r of c.recipients) if (r.delivery) delivery[r.delivery] = (delivery[r.delivery] ?? 0) + 1;
      const s = c.sender;
      return { id: c.id, code: c.code, name: c.name, status: c.status, channel: c.channel, sender: c.channel === 'email' && s ? { kind: s.kind, email: s.kind === 'tenant_mail' ? s.email || null : null, usable: s.kind === 'tenant_mail' ? s.usable : true } : null, recipients: c.recipients.length, delivery, opened: null };
    },
  },
  'campaign.analyze': {
    execute: (db) => {
      const run = MOCK_UUID(Object.keys(db.marketing.analyses).length + 2, 9600);
      // Mô phỏng worker: hai lần hỏi đầu còn chạy, lần ba xong (gợi ý giữ nguyên bộ seed).
      db.marketing.analyses[run] = 2;
      return { run_id: run, status: 'queued' };
    },
  },
  'campaign.draft_content': {
    execute: (_db, i: { text: string; tone: string }) => {
      if (unknownVars(i.text).length) throw fail('text', 'unknown_variable');
      const lead: Record<string, string> = { friendly: 'Chào {ten} 🌸 ', formal: 'Kính gửi quý khách {ten}, ', short: '', promo: '🔥 {ten} ơi, ' };
      const body = i.text.replace(/^(Chào|Kính gửi)[^,!]*[,!]\s*/i, '');
      return { text: `${lead[i.tone] ?? ''}${i.tone === 'short' ? body.split(/[.!]/)[0] : body}`.trim(), run_id: MOCK_UUID(1, 9650) };
    },
  },
};

/** CSV xuất người nhận (mock giữ trong bộ nhớ — server lưu tệp có đăng nhập). */
export const exportBlobs = new Map<string, string>();
export const marketingExportBlob = (path: string): Blob | null => {
  const csv = exportBlobs.get(path);
  return csv === undefined ? null : new Blob([csv], { type: 'text/csv' });
};

/** Trang huỷ nhận công khai — token mock `unsub-demo` hợp lệ; token lạ → 404 như server. */
let unsubscribed = false;
export const marketingPublicRoute = (path: string) => {
  const m = path.match(/^\/public\/campaign-unsubscribe\/([^/]+)$/);
  if (!m) return undefined;
  return () => {
    if (m[1] !== 'unsub-demo') throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'token' });
    return { business: 'Trâm Spa', unsubscribed };
  };
};
export const marketingPublicPost = (path: string) => {
  const m = path.match(/^\/public\/campaign-unsubscribe\/([^/]+)\/confirm$/);
  if (!m) return undefined;
  return () => {
    if (m[1] !== 'unsub-demo') throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'token' });
    unsubscribed = true;
    return { business: 'Trâm Spa', unsubscribed: true };
  };
};
