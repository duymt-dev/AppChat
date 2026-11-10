// Chẩn đoán giao thức sự kiện (TIP-003b §6.2): đếm kết cục dispatch theo nhãn HỮU HẠN (kind + lý do đã chuẩn hoá), không workspace /
// event / aggregate / payload làm nhãn. Đăng ký vào registry của tiến trình (appMetrics) lần đầu dùng; reset metrics → đăng ký lại.
import { Counter, type Registry } from 'prom-client';
import { appMetrics } from '../../metrics/registry';
import type { DispatchOutcome } from './dispatch-claim';

const REASONS = new Set(['missing_capability', 'registry_version_missing', 'topic_not_in_registry', 'waiting_completion', 'receipts_incomplete', 'invalid_outcome']);
let bound: { registry: Registry; counter: Counter<'outcome' | 'reason'> } | null = null;

function counter(): Counter<'outcome' | 'reason'> {
  const registry = appMetrics().registry;
  if (bound?.registry !== registry) {
    bound = { registry, counter: new Counter({ name: 'event_dispatch_total', help: 'Kết cục dispatch sự kiện v2 (TIP-003b)', labelNames: ['outcome', 'reason'], registers: [registry] }) };
  }
  return bound.counter;
}

/** Lý do → nhãn hữu hạn (lỗi consumer tự do gộp `failed` / `other`). */
export const reasonLabel = (o: DispatchOutcome): string => {
  const r = o.kind === 'blocked' ? o.reason : o.kind === 'retry' ? o.code : '';
  if (!r) return 'none';
  if (REASONS.has(r)) return r;
  return r.startsWith('failed:') ? 'failed' : 'other';
};

export function recordDispatch(o: DispatchOutcome): void {
  counter().inc({ outcome: o.kind, reason: reasonLabel(o) });
}
