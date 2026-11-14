// Lấy lịch sử Zalo có giới hạn (TIP-014b C): zca-js `requestOldMessages(type, lastId)` trả từng trang qua sự kiện `old_messages` (không
// có hạn ngày phía nhà cung cấp, không cam kết đủ 90 ngày). Duyệt từng loại thread (1-1, nhóm) lùi theo `lastId` = tin cũ nhất trang trước,
// tới khi: thấy tin cũ hơn mốc cắt (đủ khoảng → complete) · trang rỗng sau khi đã có tin (nhà cung cấp hết dữ liệu trước mốc →
// provider_limit; trang ĐẦU rỗng = loại thread này không có tin → không hạ báo cáo) · đủ trần
// trang / tin (partial) · quá giờ chờ một trang (timeout). Mỗi lô chờ core lưu xong (`onBatch`) rồi mới xin trang sau — không mất tin vì
// lỗi hàng đợi bị nuốt. Báo cáo ghi khoảng thực thấy (sớm nhất / muộn nhất), số tin, số trang.
import type { HistoryReport, HistoryRequest, NormalizedInbound } from '../types';
import { normalizeZalo } from './normalize';
import type { ZaloRawMessage, ZaloSession } from './transport';

type Outcome = HistoryReport['status'];
const WORSE: Record<Outcome, number> = { complete: 0, provider_limit: 1, partial: 2, timeout: 3 };

/** Một trang của một loại thread — chờ sự kiện `old_messages` đúng loại, quá giờ → null. */
function nextPage(session: ZaloSession, isGroup: boolean, lastId: string | null, timeoutMs: number): Promise<ZaloRawMessage[] | null> {
  return new Promise((resolve) => {
    let done = false;
    const off = session.onOldMessagesOnce(isGroup, (ms) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve(ms);
    });
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      off();
      resolve(null);
    }, timeoutMs);
    session.requestOldMessages(isGroup, lastId);
  });
}

export async function fetchZaloHistory(accountId: string, session: ZaloSession, req: HistoryRequest, onBatch: (batch: NormalizedInbound[]) => Promise<void>): Promise<HistoryReport> {
  const cutoff = Date.parse(req.cutoffAt);
  const report: HistoryReport = { status: 'complete', received: 0, inRange: 0, pages: 0, earliestAt: null, latestAt: null };
  const seen = (ts: number) => {
    const iso = new Date(ts).toISOString();
    if (!report.earliestAt || iso < report.earliestAt) report.earliestAt = iso;
    if (!report.latestAt || iso > report.latestAt) report.latestAt = iso;
  };
  for (const isGroup of [false, true]) {
    let lastId: string | null = null;
    let outcome: Outcome = 'partial';
    for (;;) {
      if (report.pages >= req.maxPages || report.received >= req.maxMessages) break;
      const page = await nextPage(session, isGroup, lastId, req.pageTimeoutMs);
      if (page === null) {
        outcome = 'timeout';
        break;
      }
      report.pages++;
      if (!page.length) {
        outcome = lastId === null ? 'complete' : 'provider_limit';
        break;
      }
      report.received += page.length;
      let oldest: ZaloRawMessage | null = null;
      const batch: NormalizedInbound[] = [];
      for (const m of page) {
        const ts = Number(m.ts);
        if (!Number.isFinite(ts)) continue;
        seen(ts);
        if (!oldest || ts < Number(oldest.ts)) oldest = m;
        if (ts < cutoff) continue;
        const n = normalizeZalo(accountId, m, session.ownId);
        if (n) batch.push(n);
      }
      report.inRange += batch.length;
      if (batch.length) await onBatch(batch);
      // Trang đã chạm mốc cắt → khoảng yêu cầu đã phủ đủ cho loại thread này.
      if (oldest && Number(oldest.ts) < cutoff) {
        outcome = 'complete';
        break;
      }
      // Không lùi được (id tin cũ nhất trùng lần trước) → coi như nhà cung cấp hết dữ liệu.
      if (!oldest || oldest.msgId === lastId) {
        outcome = 'provider_limit';
        break;
      }
      lastId = oldest.msgId;
    }
    if (WORSE[outcome] > WORSE[report.status]) report.status = outcome;
  }
  return report;
}
