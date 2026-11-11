// Sẵn sàng v2 (TIP-003b §5.1–5.4): manifest kỳ vọng do worker liệt kê ĐỘC LẬP (không tính từ thứ đã đăng ký) được so với registry đã
// đóng băng. Thiếu / thừa / trùng / sai chế độ / sai version / topic lệch → không sẵn sàng; consumer v1 chưa có adapter v2 là "blocker"
// tường minh (003c / 006b / TIP chủ) — không bao giờ cho handler void cũ chạy dưới biên nhận v2 giả. Kết quả giữ ở tiến trình; dispatcher
// v2 từ chối mọi event khi chưa sẵn sàng (hàng dispatch bền còn đó, khôi phục sau).
import { eventConsumers } from '../consumer';
import type { FrozenRegistry } from './registry';
import type { ReceiptMode } from './types';

export interface ManifestConsumer {
  name: string;
  /** `active` = phải có hợp đồng v2 đã đăng ký đúng chế độ / version / topic. `requires_adapter` = còn là consumer v1, chặn bật v2. */
  status: 'active' | 'requires_adapter' | 'retired';
  mode?: ReceiptMode;
  contractVersion?: number;
  /** Tập topic cố định; `'from_rules'` = theo luật domain đăng ký (notify / realtime — TIP-006b): phải khớp consumer v1 cùng tên. */
  topics?: readonly string[] | 'from_rules';
  /** TIP sở hữu adapter (vd. 003c, 006b). */
  owner: string;
  roles: readonly ('jobs' | 'all' | 'ai' | 'channels')[];
}

export interface EventProtocolManifest {
  version: number;
  consumers: readonly ManifestConsumer[];
  /** Topic khai TƯỜNG MINH không có consumer domain. */
  noSubscriber: readonly string[];
}

export interface Readiness {
  ready: boolean;
  role: string;
  digest: string | null;
  missing: string[];
  unexpected: string[];
  mismatched: string[];
  blockers: string[];
}

let current: Readiness | null = null;

/** Topic theo luật domain (consumer v1 cùng tên đã đăng ký) — nguồn so cho manifest `from_rules`. */
function rulesTopics(name: string): readonly string[] | null {
  const t = eventConsumers().find((x) => x.name === name)?.topics;
  return !t || t === '*' ? null : typeof t === 'function' ? t() : t;
}

export function evaluateReadiness(m: EventProtocolManifest, frozen: FrozenRegistry | null, role: string): Readiness {
  const out: Readiness = { ready: false, role, digest: frozen?.digest ?? null, missing: [], unexpected: [], mismatched: [], blockers: [] };
  if (!frozen) {
    out.blockers.push('registry_not_frozen');
    return out;
  }
  const names = new Set<string>();
  for (const c of m.consumers) {
    if (names.has(c.name)) out.mismatched.push(`${c.name}:duplicate`);
    names.add(c.name);
    if (!c.roles.includes(role as never)) continue;
    const reg = frozen.contracts.get(c.name);
    if (c.status === 'requires_adapter') {
      out.blockers.push(`${c.name}:${c.owner}`);
      continue;
    }
    if (c.status === 'retired') {
      if (reg) out.unexpected.push(`${c.name}:retired`);
      continue;
    }
    if (!reg) {
      out.missing.push(c.name);
      continue;
    }
    const want = [...(c.topics === 'from_rules' ? (rulesTopics(c.name) ?? []) : (c.topics ?? []))].sort().join(',');
    const got = [...reg.topics].sort().join(',');
    if (reg.mode !== c.mode || reg.contractVersion !== c.contractVersion || want !== got) out.mismatched.push(c.name);
  }
  for (const name of frozen.contracts.keys()) if (!names.has(name)) out.unexpected.push(name);
  for (const t of m.noSubscriber) if ((frozen.table[t]?.length ?? 0) > 0) out.mismatched.push(`${t}:declared_no_subscriber`);
  out.ready = !out.missing.length && !out.unexpected.length && !out.mismatched.length && !out.blockers.length;
  return out;
}

export const setEventReadiness = (r: Readiness): void => {
  current = r;
};
export const eventReadiness = (): Readiness | null => current;
/** Chỉ test. */
export const resetEventReadinessForTest = (): void => {
  current = null;
};
