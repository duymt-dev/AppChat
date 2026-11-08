// Chuyển phụ trách khách (TIP-015d §4.4–4.5): một khách hoặc các khách đã chọn — mỗi khách MỘT action contact.transfer_owner (atomic riêng,
// hoàn tác riêng), không giả "tất cả hoặc không" giữa các khách. Kết quả theo từng khách lấy từ server: chuyển thật (3 số đếm), đã là người
// phụ trách (bỏ qua), chờ duyệt, lỗi (mã lỗi). Không đếm "chờ duyệt" là đã chuyển. Huỷ chỉ dừng giữa các khách — khách đã chuyển giữ nguyên.
'use client';
import { useCallback, useRef, useState } from 'react';
import { useAction } from '@/shared/actions/useAction';
import type { ApiRequestError } from '@appchat/shared';

export type Moved = { conversations: number; quotes: number; appointments: number };
export type MoveFlags = { conversations: boolean; quotes: boolean; appointments: boolean };
type Out =
  | { status: 'transferred'; owner_user_id: string; moved: Moved; transfer_id: string; version: number }
  | { status: 'skipped_already_owner'; owner_user_id: string; moved: Moved; transfer_id: null; version: number };

export type TransferOutcome =
  | { contactId: string; kind: 'transferred'; moved: Moved; transferId: string; logId: string }
  | { contactId: string; kind: 'skipped' }
  | { contactId: string; kind: 'pending_approval' }
  | { contactId: string; kind: 'error'; code: string }
  | { contactId: string; kind: 'cancelled' };

export interface TransferRequest {
  contactId: string;
  version?: number;
}

export function useContactTransfer() {
  const action = useAction<Out>('contact.transfer_owner');
  const [results, setResults] = useState<TransferOutcome[]>([]);
  const [running, setRunning] = useState(false);
  const stop = useRef(false);

  const runOne = useCallback(
    async (r: TransferRequest, to: string, move: MoveFlags, note: string | undefined, silent: boolean): Promise<TransferOutcome> => {
      let code = '';
      let pending = false;
      const res = await action.run(
        { contact_id: r.contactId, to_user_id: to, move, ...(note ? { note } : {}), ...(r.version ? { if_version: r.version } : {}) },
        {
          silent,
          onAccepted: (a) => {
            pending = a.status === 'approval_required';
          },
          onError: (e: ApiRequestError) => {
            code = e.error.code;
            return silent;
          },
        },
      );
      if (res) {
        const o = res.result;
        return o.status === 'transferred' ? { contactId: r.contactId, kind: 'transferred', moved: o.moved, transferId: o.transfer_id, logId: res.action_log_id } : { contactId: r.contactId, kind: 'skipped' };
      }
      if (pending) return { contactId: r.contactId, kind: 'pending_approval' };
      return { contactId: r.contactId, kind: 'error', code: code || 'CANCELLED' };
    },
    [action],
  );

  /** Chạy tuần tự từng khách; `silent` cho chạy nhiều khách (bảng kết quả thay toast). */
  const run = useCallback(
    async (reqs: TransferRequest[], to: string, move: MoveFlags, note?: string) => {
      stop.current = false;
      setRunning(true);
      const out: TransferOutcome[] = [];
      setResults([]);
      for (const r of reqs) {
        if (stop.current) out.push({ contactId: r.contactId, kind: 'cancelled' });
        else out.push(await runOne(r, to, move, note, reqs.length > 1));
        setResults([...out]);
      }
      setRunning(false);
      return out;
    },
    [runOne],
  );

  return { run, results, running, cancel: () => (stop.current = true), reset: () => setResults([]) };
}

/** Tổng hợp cho thẻ kết quả: số khách theo loại + tổng bản ghi chuyển kèm (chỉ khách chuyển thật). */
export function summarize(rs: TransferOutcome[]) {
  const by = (k: TransferOutcome['kind']) => rs.filter((r) => r.kind === k).length;
  const moved = rs.reduce<Moved>((m, r) => (r.kind === 'transferred' ? { conversations: m.conversations + r.moved.conversations, quotes: m.quotes + r.moved.quotes, appointments: m.appointments + r.moved.appointments } : m), { conversations: 0, quotes: 0, appointments: 0 });
  return { transferred: by('transferred'), skipped: by('skipped'), pending: by('pending_approval'), errors: by('error'), cancelled: by('cancelled'), moved };
}
