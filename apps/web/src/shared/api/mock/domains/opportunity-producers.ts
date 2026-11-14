// Mock producer chứng từ → cơ hội (TIP-026c §3, cùng luật `crm/opportunities/transitions.ts`): gửi báo giá → Báo giá (cờ sync = giá trị
// theo tổng, cờ theo dõi = việc +2 ngày); khách chốt → Đàm phán; từ chối / hết hạn khi không còn báo giá mở → Tư vấn / Demo; tạo đơn /
// hợp đồng ký → Đã mua; huỷ đơn khi không còn chứng từ sống → Đàm phán; lịch hẹn hoàn thành → chỉ ghi gợi ý AI (không tự đổi). Thua /
// Đã mua không bị luật tự động đổi (trừ huỷ đưa won về Đàm phán). Liên kết: cùng khách, chưa Thua (sai → 422 như server).
import { ApiRequestError, nextOpportunityStage, opportunityRank, type OpportunityStage } from '@appchat/shared';
import type { MockDb } from '../store';
import { findOpp, liveDocs, move, oppNow, type OppDoc, type OppStore } from './contact-opportunities';

const OPEN_QUOTE = ['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'revision_requested'];
const store = (db: MockDb): OppStore => db.customers.activities.pipeline;
const live = (s: OppStore, id: string | null | undefined) => {
  const o = id ? findOpp(s, id) : null;
  return o && !o.archived && o.stage !== 'won' && o.stage !== 'lost' ? o : null;
};

/** Kiểm "Thuộc cơ hội" của form Báo giá / Lịch hẹn — khác khách / Thua / không có → 422 (server: checkOpportunityLink). */
export function checkOppLink(db: MockDb, contactId: string, id: string | null | undefined): string | null {
  if (!id) return null;
  const o = findOpp(store(db), id);
  if (!o || o.archived || o.contact_id !== contactId) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'opportunity_link', fields: { opportunity_id: 'opportunity_other_contact' } });
  if (o.stage === 'lost') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'opportunity_lost', fields: { opportunity_id: 'opportunity_lost' } });
  return o.id;
}

/** Ghi / cập nhật chứng từ trong chuỗi của cơ hội (drawer đọc `docs`). */
export function linkDoc(db: MockDb, d: OppDoc) {
  const s = store(db);
  const cur = s.docs.find((x) => x.id === d.id);
  if (cur) Object.assign(cur, d);
  else if (d.opportunity_id) s.docs.push(d);
}

export const docStatus = (db: MockDb, id: string, status: string) => {
  const d = store(db).docs.find((x) => x.id === id);
  if (d) d.status = status;
};

type QuoteFacts = { id: string; code: string; contact_id: string; opportunity_id?: string | null; total: string; sync?: boolean; follow?: boolean };

export function onQuoteSent(db: MockDb, q: QuoteFacts) {
  const s = store(db);
  const o = live(s, q.opportunity_id);
  if (!o) return;
  linkDoc(db, { opportunity_id: o.id, step: 'quote', id: q.id, code: q.code, status: 'sent', amount_vnd: q.total });
  if (opportunityRank(o.stage) < opportunityRank('quote')) move(s, o, 'quote', 'stage', { ref: q.id });
  if (q.sync !== false && o.amount_vnd !== q.total) Object.assign(o, { amount_vnd: q.total, version: o.version + 1, updated_at: oppNow() });
  if (q.follow !== false) {
    const title = `Theo dõi phản hồi báo giá ${q.code}`;
    const tasks = db.customers.activities.tasks;
    if (!tasks.some((x) => x.contact_id === q.contact_id && x.title === title && x.state === 'open'))
      tasks.unshift({ id: `tk_${q.id}`, contact_id: q.contact_id, title, description: '', due_at: new Date(Date.now() + 2 * 86_400_000).toISOString(), assignee_id: o.owner?.id ?? null, state: 'open', completed_at: null, version: 1, created_at: oppNow() });
  }
}

export function onQuoteAccepted(db: MockDb, q: { id: string; opportunity_id?: string | null }) {
  const s = store(db);
  docStatus(db, q.id, 'accepted');
  const o = live(s, q.opportunity_id);
  if (o && opportunityRank(o.stage) < opportunityRank('negotiation')) move(s, o, 'negotiation', 'stage', { ref: q.id });
}

export function onQuoteClosed(db: MockDb, q: { id: string; opportunity_id?: string | null }, status: 'rejected' | 'expired') {
  const s = store(db);
  docStatus(db, q.id, status);
  const o = live(s, q.opportunity_id);
  if (!o || (o.stage !== 'quote' && o.stage !== 'negotiation')) return;
  const others = db.quotes.quotes.some((x) => x.id !== q.id && !x.deleted && x.opportunity_id === o.id && OPEN_QUOTE.includes(x.status));
  if (!others) move(s, o, 'demo', 'stage', { ref: q.id });
}

export function onDocumentWon(db: MockDb, opportunityId: string | null | undefined, d: Omit<OppDoc, 'opportunity_id'>) {
  const s = store(db);
  if (!opportunityId) return;
  linkDoc(db, { ...d, opportunity_id: opportunityId });
  const o = live(s, opportunityId);
  if (o) move(s, o, 'won', 'stage', { ref: d.id });
}

export function onDocumentUndone(db: MockDb, docId: string, status: string) {
  const s = store(db);
  const d = s.docs.find((x) => x.id === docId);
  if (!d) return;
  d.status = status;
  const o = findOpp(s, d.opportunity_id);
  if (o && !o.archived && o.stage === 'won' && !liveDocs(s, o.id)) move(s, o, 'negotiation', 'stage', { ref: docId });
}

/** Lịch hẹn gắn cơ hội Lead / Đủ điều kiện / Tư vấn hoàn thành → event `ai_suggested` bước kế (thẻ hiện "Áp dụng / Bỏ qua"). */
export function onAppointmentDone(db: MockDb, a: { id: string; opportunity_id?: string | null }) {
  const s = store(db);
  const o = live(s, a.opportunity_id);
  if (!o || !['lead', 'qualified', 'demo'].includes(o.stage)) return;
  const to = nextOpportunityStage(o.stage) as OpportunityStage | null;
  if (to) s.events.push({ id: `oe_ai_${a.id}`, opportunity_id: o.id, kind: 'ai_suggested', from: o.stage, to, params: { reason: 'appointment_done' }, at: oppNow() });
}
